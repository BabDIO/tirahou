"""
Module de gestion des évaluations et résultats académiques
===========================================================

Ce module implémente le système complet d'évaluation LMD :
- Gestion des sessions d'examen (normale + rattrapage)
- Saisie et validation des notes (CC 40% + Examen 60%)
- Calcul automatique des résultats UE et semestriels
- Système de compensation et capitalisation des crédits
- Gestion des réclamations de notes
- Publication contrôlée des résultats avec notifications
- Historique des modifications
- Calcul des mentions, GPA et classements

Règles LMD implémentées :
- UE validée : moyenne ≥ 10/20 → capitalisation définitive
- Semestre admis : moyenne ≥ 10/20 + toutes UE validées ou compensées
- Compensation : UE <10 compensée par UE >10 dans même semestre
- Session de rattrapage : pour UE non validées
- Crédits ECTS : acquis uniquement pour UE validées

@author: TIRAHOU
@version: 1.2.0
@date: Juillet 2026
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.programs.models import UE, EC, Semester
from apps.people.models import Student, Teacher
from apps.enrollment.models import UEEnrollment


class ExamSession(BaseModel):
    """
    Session d'examen (normale ou rattrapage).
    
    Chaque semestre a 2 sessions :
    - Session 1 (normale) : première évaluation
    - Session 2 (rattrapage) : pour étudiants ajournés
    
    Attributes:
        semester (ForeignKey): Semestre concerné
        academic_year (ForeignKey): Année académique
        session_type (str): Type de session (session1/session2)
        start_date (date): Date de début
        end_date (date): Date de fin
        is_open (bool): Session ouverte pour saisie des notes
    """
    SESSION_CHOICES = [
        ('session1', 'Session 1 (Normale)'),
        ('session2', 'Session 2 (Rattrapage)'),
    ]

    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='exam_sessions')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    session_type = models.CharField(max_length=10, choices=SESSION_CHOICES, default='session1')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_open = models.BooleanField(default=False)

    class Meta:
        db_table = 'exam_sessions'
        unique_together = ('semester', 'academic_year', 'session_type')
        verbose_name = 'Session d\'Examen'

    def __str__(self):
        return f"{self.semester} — {self.get_session_type_display()} ({self.academic_year})"


class ExamRoomAssignment(BaseModel):
    """
    Planification d'un examen : salle, créneau et surveillants pour un EC
    donné d'une session d'examen (8.20 / G7 du cahier des charges).
    """
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='room_assignments')
    ec = models.ForeignKey(EC, on_delete=models.CASCADE, related_name='exam_room_assignments')
    room = models.ForeignKey('scheduling_app.Room', on_delete=models.SET_NULL, null=True, related_name='exam_assignments')
    invigilators = models.ManyToManyField(User, blank=True, related_name='exam_invigilations')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'exam_room_assignments'
        unique_together = ('exam_session', 'ec')
        ordering = ['start_datetime']
        verbose_name = 'Planification d\'examen'

    def __str__(self):
        return f"{self.ec.code} — {self.room} ({self.start_datetime:%d/%m/%Y %H:%M})"


class Grade(BaseModel):
    """
    Note individuelle d'un étudiant pour un EC (Élément Constitutif).
    
    Gère la saisie, validation et publication des notes avec workflow complet :
    1. SAISIE : Enseignant saisit CC + Examen
    2. VALIDÉE : Responsable pédagogique valide
    3. PUBLIÉE : Note visible par l'étudiant
    4. CONTESTÉE : Étudiant a fait une réclamation
    
    Calcul automatique de la note finale :
    - Note finale = (CC × 40%) + (Examen × 60%) + Bonus - Pénalités
    - Absent : note finale = 0
    - Historique complet des modifications
    
    Attributes:
        student (ForeignKey): Étudiant évalué
        ec (ForeignKey): Élément Constitutif (matière)
        exam_session (ForeignKey): Session d'examen
        cc_grade (Decimal): Note de Contrôle Continu (0-20)
        exam_grade (Decimal): Note d'Examen (0-20)
        final_grade (Decimal): Note finale calculée (0-20)
        is_absent (bool): Étudiant absent à l'examen
        status (str): Statut du workflow (saisie/validee/publiee/contestee)
        cc_weight (Decimal): Pondération CC (par défaut 0.4 = 40%)
        exam_weight (Decimal): Pondération Examen (par défaut 0.6 = 60%)
        bonus_points (Decimal): Points bonus (ex: participation)
        penalty_points (Decimal): Pénalités (ex: retard)
        appreciation (str): Commentaire de l'enseignant
        modification_history (JSON): Historique des changements
    """
    
    STATUS_CHOICES = [
        ('saisie', 'Saisie'),
        ('validee', 'Validée'),
        ('publiee', 'Publiée'),
        ('contestee', 'Contestée'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    ec = models.ForeignKey(EC, on_delete=models.CASCADE, related_name='grades')
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='grades')
    cc_grade = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    exam_grade = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    final_grade = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    is_absent = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='saisie')
    entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='entered_grades')
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_grades')
    validated_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # AMÉLIORATIONS: Gestion avancée des notes
    cc_weight = models.DecimalField(max_digits=3, decimal_places=2, default=0.4, help_text="Pondération CC (0.4 = 40%)")
    exam_weight = models.DecimalField(max_digits=3, decimal_places=2, default=0.6, help_text="Pondération Examen (0.6 = 60%)")
    bonus_points = models.DecimalField(max_digits=4, decimal_places=2, default=0, help_text="Points bonus")
    penalty_points = models.DecimalField(max_digits=4, decimal_places=2, default=0, help_text="Points de pénalité")
    is_rattrapage = models.BooleanField(default=False, help_text="Note de rattrapage")
    previous_grade = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='rattrapage_grades')
    appreciation = models.TextField(blank=True, help_text="Appréciation de l'enseignant")
    published_to_student = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    modification_history = models.JSONField(default=list, blank=True, help_text="Historique des modifications")

    class Meta:
        db_table = 'grades'
        unique_together = ('student', 'ec', 'exam_session')
        verbose_name = 'Note'

    def __str__(self):
        return f"{self.student} — {self.ec.code} : {self.final_grade}/20"
    
    def calculate_final_grade(self):
        """
        Calcule automatiquement la note finale selon la formule LMD.
        
        Formule :
            Note finale = (CC × poids_CC) + (Examen × poids_examen) + Bonus - Pénalités
            
        Par défaut :
            Note finale = (CC × 0.4) + (Examen × 0.6)
            
        Cas particuliers :
            - Absent : note finale = 0
            - Note finale limitée entre 0 et 20
            
        Returns:
            Decimal: Note finale calculée
            
        Examples:
            >>> grade = Grade(cc_grade=15, exam_grade=12, cc_weight=0.4, exam_weight=0.6)
            >>> grade.calculate_final_grade()
            13.2  # (15 × 0.4) + (12 × 0.6) = 6 + 7.2 = 13.2
        """
        if self.is_absent:
            self.final_grade = 0
            return self.final_grade
        
        # Calcul avec pondérations
        cc = float(self.cc_grade or 0)
        exam = float(self.exam_grade or 0)
        
        base_grade = (cc * float(self.cc_weight)) + (exam * float(self.exam_weight))
        
        # Ajouter bonus et soustraire pénalités
        final = base_grade + float(self.bonus_points) - float(self.penalty_points)
        
        # Limiter entre 0 et 20
        self.final_grade = max(0, min(20, final))
        
        return self.final_grade
    
    def save(self, *args, **kwargs):
        # Calculer automatiquement la note finale
        if self.cc_grade is not None or self.exam_grade is not None:
            self.calculate_final_grade()
        
        # Enregistrer l'historique des modifications
        if self.pk:  # Si la note existe déjà
            old_grade = Grade.objects.filter(pk=self.pk).first()
            if old_grade and old_grade.final_grade != self.final_grade:
                if not isinstance(self.modification_history, list):
                    self.modification_history = []
                self.modification_history.append({
                    'date': str(timezone.now()),
                    'old_grade': float(old_grade.final_grade) if old_grade.final_grade else None,
                    'new_grade': float(self.final_grade) if self.final_grade else None,
                    'modified_by': self.entered_by.get_full_name() if self.entered_by else 'Système',
                })
        
        super().save(*args, **kwargs)
    
    def publish_to_student(self):
        """
        Publie la note à l'étudiant et envoie une notification.
        
        Actions effectuées :
        1. Marque la note comme publiée
        2. Change le statut à 'publiee'
        3. Enregistre la date de publication
        4. Envoie une notification email + push à l'étudiant
        
        La notification contient :
        - Nom du cours (EC)
        - Note obtenue
        - Lien direct vers le relevé de notes
        
        Raises:
            Aucune exception levée, les erreurs de notification sont silencieuses
            
        Examples:
            >>> grade = Grade.objects.get(id=123)
            >>> grade.publish_to_student()  # Étudiant reçoit une notification
        """
        from django.utils import timezone
        from apps.communication.models import Notification
        
        self.published_to_student = True
        self.published_at = timezone.now()
        self.status = 'publiee'
        self.save()
        
        # Envoyer une notification
        Notification.objects.create(
            recipient=self.student.user,
            title=f"Nouvelle note disponible - {self.ec.code}",
            message=f"Votre note pour {self.ec.name} est disponible : {self.final_grade}/20",
            type='resultat',
            priority='high',
            icon='award',
            color='emerald',
            action_url='/student/grades',
            action_label='Voir mes notes',
            is_sent=True,
            sent_at=timezone.now()
        )

        try:
            from apps.core.tasks import dispatch_webhook
            dispatch_webhook('grade.published', {
                'student_id': str(self.student_id), 'student_number': self.student.student_id,
                'ec_code': self.ec.code, 'final_grade': float(self.final_grade) if self.final_grade is not None else None,
            })
        except Exception:
            pass


class UEResult(BaseModel):
    """
    Résultat d'une Unité d'Enseignement (UE) pour un étudiant.
    
    Représente le résultat agrégé de tous les EC d'une UE.
    La moyenne de l'UE est calculée à partir des notes des EC pondérées
    par leurs coefficients respectifs.
    
    Décisions possibles (LMD) :
    - VALIDÉ : moyenne ≥ 10/20 → crédits acquis définitivement (capitalisation)
    - AJOURNÉ : moyenne < 10/20 → aucun crédit
    - COMPENSÉ : moyenne < 10/20 mais compensée par autre UE du semestre
    - DETTE : UE non validée à reprendre
    - ABSENT : étudiant absent aux évaluations
    
    Calcul de la moyenne UE :
    moyenne_ue = Σ(note_EC × coef_EC) / Σ(coef_EC)
    
    Attributes:
        student (ForeignKey): Étudiant
        ue (ForeignKey): Unité d'Enseignement
        exam_session (ForeignKey): Session d'examen
        average (Decimal): Moyenne calculée de l'UE (0-20)
        credits_obtained (int): Crédits ECTS obtenus (0 ou credits de l'UE)
        decision (str): Décision finale (valide/ajourné/compense/dette/absent)
        is_capitalized (bool): UE définitivement capitalisée
        compensation_source (FK): UE qui compense celle-ci (si compensé)
        rank_in_ue (int): Classement de l'étudiant dans l'UE
        total_students (int): Nombre total d'étudiants dans l'UE
        percentile (Decimal): Percentile de l'étudiant (0-100)
    """
    
    DECISION_CHOICES = [
        ('valide', 'Validé'),
        ('ajourné', 'Ajourné'),
        ('compense', 'Compensé'),
        ('dette', 'Dette'),
        ('absent', 'Absent'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='ue_results')
    ue = models.ForeignKey(UE, on_delete=models.CASCADE, related_name='results')
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE)
    average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    credits_obtained = models.PositiveSmallIntegerField(default=0)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, null=True, blank=True)
    
    # Calcul automatique et détails
    is_capitalized = models.BooleanField(default=False, help_text="UE capitalisée")
    compensation_source = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, help_text="UE qui compense")
    rank_in_ue = models.PositiveIntegerField(null=True, blank=True, help_text="Classement dans l'UE")
    total_students = models.PositiveIntegerField(null=True, blank=True, help_text="Nombre total d'étudiants")
    percentile = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentile")

    class Meta:
        db_table = 'ue_results'
        unique_together = ('student', 'ue', 'exam_session')
        verbose_name = 'Résultat UE'

    def __str__(self):
        return f"{self.student} — {self.ue.code} : {self.average}/20 ({self.decision})"
    
    def calculate_ue_average(self):
        """
        Calcule la moyenne pondérée de l'UE à partir des notes des EC.
        
        Algorithme :
        1. Récupère toutes les notes validées des EC de cette UE
        2. Multiplie chaque note par le coefficient de son EC
        3. Fait la somme pondérée et divise par la somme des coefficients
        4. Détermine la décision (validé si ≥ 10, ajourné sinon)
        5. Attribue les crédits si validé
        
        Formule :
            moyenne_ue = Σ(note_EC_i × coef_EC_i) / Σ(coef_EC_i)
            
        Décision :
            - moyenne_ue ≥ 10 → VALIDÉ + crédits acquis
            - moyenne_ue < 10 → AJOURNÉ + 0 crédit
            
        Returns:
            Decimal: Moyenne calculée ou None si aucune note
            
        Examples:
            >>> ue_result = UEResult.objects.get(id=1)
            >>> ue_result.calculate_ue_average()
            12.5  # Moyenne calculée
            >>> ue_result.decision
            'valide'
            >>> ue_result.credits_obtained
            6  # Crédits de l'UE
        """
        from django.db.models import Avg, Sum, F
        
        # Récupérer toutes les notes des EC de cette UE
        grades = Grade.objects.filter(
            student=self.student,
            ec__ue=self.ue,
            exam_session=self.exam_session,
            status__in=['validee', 'publiee']
        ).select_related('ec')
        
        if not grades.exists():
            return None
        
        # Calcul pondéré par les coefficients des EC
        total_weighted = 0
        total_coef = 0
        
        for grade in grades:
            if grade.final_grade is not None and not grade.is_absent:
                coef = float(grade.ec.coefficient or 1)
                total_weighted += float(grade.final_grade) * coef
                total_coef += coef
        
        if total_coef == 0:
            return None

        self.average = round(total_weighted / total_coef, 2)

        # Étudiant absent à toutes les évaluations de l'UE : décision figée,
        # non réévaluée par la compensation semestrielle.
        if all(g.is_absent for g in grades):
            self.decision = 'absent'
            self.credits_obtained = 0
            self.save()
            return self.average

        # Décision provisoire : la compensation éventuelle (voir
        # SemesterResult.calculate_semester_average) n'est déterminable
        # qu'une fois la moyenne du semestre connue.
        if self.average >= 10:
            self.decision = 'valide'
            self.credits_obtained = self.ue.credits
            self.is_capitalized = True
        else:
            self.decision = 'ajourné'
            self.credits_obtained = 0

        self.save()
        return self.average
    
    def calculate_rank(self):
        """Calcule le classement de l'étudiant dans l'UE"""
        # Récupérer tous les résultats de cette UE pour cette session
        all_results = UEResult.objects.filter(
            ue=self.ue,
            exam_session=self.exam_session,
            average__isnull=False
        ).order_by('-average')
        
        self.total_students = all_results.count()
        
        # Trouver le rang
        for idx, result in enumerate(all_results, 1):
            if result.id == self.id:
                self.rank_in_ue = idx
                self.percentile = round((idx / self.total_students) * 100, 2) if self.total_students > 0 else None
                break
        
        self.save()
        return self.rank_in_ue


class SemesterResult(BaseModel):
    DECISION_CHOICES = [
        ('admis', 'Admis'),
        ('ajourné', 'Ajourné'),
        ('redoublant', 'Redoublant'),
        ('exclu', 'Exclu'),
        ('epuisement', 'Épuisement de scolarité'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='semester_results')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE)
    average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_credits = models.PositiveSmallIntegerField(default=0)
    credits_obtained = models.PositiveSmallIntegerField(default=0)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, null=True, blank=True)
    rank = models.PositiveIntegerField(null=True, blank=True)
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # AMÉLIORATIONS: Détails et statistiques
    mention = models.CharField(max_length=50, blank=True, help_text="Mention obtenue")
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text="GPA (0-4)")
    total_students_in_semester = models.PositiveIntegerField(null=True, blank=True)
    percentile = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ues_validated = models.PositiveSmallIntegerField(default=0, help_text="Nombre d'UE validées")
    ues_failed = models.PositiveSmallIntegerField(default=0, help_text="Nombre d'UE échouées")
    jury_observations = models.TextField(blank=True, help_text="Observations du jury")
    deliberation_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'semester_results'
        unique_together = ('student', 'semester', 'exam_session')
        verbose_name = 'Résultat Semestriel'

    def __str__(self):
        return f"{self.student} — {self.semester} : {self.average}/20"
    
    def calculate_semester_average(self):
        """
        Calcule la moyenne du semestre à partir des résultats des UE et applique
        les règles de progression LMD du règlement pédagogique en vigueur
        (validation, compensation, dette, redoublement, exclusion, épuisement
        de scolarité) — voir apps.academic.models.LMDRegulation.
        """
        ue_results = list(UEResult.objects.filter(
            student=self.student,
            ue__semester=self.semester,
            exam_session=self.exam_session
        ).select_related('ue').exclude(average=None))

        if not ue_results:
            return None

        # Moyenne semestrielle pondérée par les crédits de chaque UE
        total_weighted = sum(float(r.average) * r.ue.credits for r in ue_results)
        total_credits = sum(r.ue.credits for r in ue_results)
        if total_credits == 0:
            return None

        self.average = round(total_weighted / total_credits, 2)
        self.total_credits = total_credits

        regulation = self.semester.program.regulation
        passing_grade = float(regulation.passing_grade) if regulation else 10.0
        compensation_allowed = regulation.compensation_allowed if regulation else True
        compensation_min = float(regulation.compensation_min_grade) if regulation else 8.0
        semester_admitted = self.average >= passing_grade

        # Appliquer la compensation UE par UE maintenant que la moyenne
        # semestrielle globale est connue (une UE <10 ne peut être compensée
        # que si le semestre est globalement admis et que sa moyenne ne
        # descend pas sous le plancher de compensation du règlement).
        validated, failed, credits_obtained = 0, 0, 0
        for ue_result in ue_results:
            if ue_result.decision == 'absent':
                failed += 1
                continue
            avg = float(ue_result.average)
            if avg >= passing_grade:
                pass  # déjà 'valide' depuis calculate_ue_average
            elif semester_admitted and compensation_allowed and avg >= compensation_min:
                ue_result.decision = 'compense'
                ue_result.credits_obtained = ue_result.ue.credits
                ue_result.is_capitalized = True
            elif semester_admitted:
                ue_result.decision = 'dette'
                ue_result.credits_obtained = 0
            else:
                ue_result.decision = 'ajourné'
                ue_result.credits_obtained = 0
            ue_result.save(update_fields=['decision', 'credits_obtained', 'is_capitalized'])

            if ue_result.decision in ('valide', 'compense'):
                validated += 1
            else:
                failed += 1
            credits_obtained += ue_result.credits_obtained

        self.ues_validated = validated
        self.ues_failed = failed
        self.credits_obtained = credits_obtained

        # GPA (0-4)
        self.gpa = round((float(self.average) / 20) * 4, 2)

        # Mention
        if self.average >= 16:
            self.mention = "Très Bien"
        elif self.average >= 14:
            self.mention = "Bien"
        elif self.average >= 12:
            self.mention = "Assez Bien"
        elif self.average >= 10:
            self.mention = "Passable"
        else:
            self.mention = ""

        self.decision = self._determine_progression_decision(semester_admitted, regulation)
        self.save()
        return self.average

    def _determine_progression_decision(self, semester_admitted, regulation):
        """
        Détermine admis / ajourné / redoublant / exclu / épuisement de
        scolarité selon l'historique de l'étudiant sur ce semestre précis
        et la durée réglementaire maximale du cycle (LMDRegulation).
        """
        if semester_admitted:
            return 'admis'

        max_years = regulation.max_years_allowed if regulation else 5

        # Tentatives déjà effectuées sur ce même semestre (hors calcul en cours)
        previous_attempts = SemesterResult.objects.filter(
            student=self.student, semester=self.semester
        ).exclude(pk=self.pk).count()

        # Nombre d'années académiques distinctes passées dans ce programme
        years_spent = SemesterResult.objects.filter(
            student=self.student, semester__program=self.semester.program
        ).exclude(pk=self.pk).values('exam_session__academic_year').distinct().count() + 1

        if years_spent > max_years:
            return 'epuisement'
        if previous_attempts >= 2:
            return 'exclu'
        if previous_attempts == 1:
            return 'redoublant'
        return 'ajourné'
    
    def calculate_rank(self):
        """Calcule le classement de l'étudiant dans le semestre"""
        all_results = SemesterResult.objects.filter(
            semester=self.semester,
            exam_session=self.exam_session,
            average__isnull=False
        ).order_by('-average')
        
        self.total_students_in_semester = all_results.count()
        
        for idx, result in enumerate(all_results, 1):
            if result.id == self.id:
                self.rank = idx
                self.percentile = round((idx / self.total_students_in_semester) * 100, 2) if self.total_students_in_semester > 0 else None
                break
        
        self.save()
        return self.rank
    
    def publish_results(self):
        """Publier les résultats avec notification"""
        from apps.communication.models import Notification
        
        self.published = True
        self.published_at = timezone.now()
        self.save()
        
        # Notification à l'étudiant
        message = f"Vos résultats du {self.semester} sont disponibles.\n"
        message += f"Moyenne: {self.average}/20\n"
        message += f"Crédits obtenus: {self.credits_obtained}/{self.total_credits}\n"
        message += f"Décision: {self.get_decision_display()}"
        if self.mention:
            message += f"\nMention: {self.mention}"
        if self.rank:
            message += f"\nClassement: {self.rank}/{self.total_students_in_semester}"
        
        Notification.objects.create(
            recipient=self.student.user,
            title=f"🎓 Résultats {self.semester}",
            message=message,
            type='resultat',
            priority='urgent',
            icon='trophy',
            color='gold' if self.decision == 'admis' else 'red',
            action_url='/student/grades',
            action_label='Voir mes résultats',
            is_sent=True,
            sent_at=timezone.now()
        )

        self._award_excellence_badge()

    def _award_excellence_badge(self):
        """
        Attribution automatique d'un badge « Excellence académique » +
        points de portefeuille pour les mentions Bien/Très Bien (8.30.2/3
        — S2/S3). Best-effort : ne bloque jamais la publication des
        résultats si l'app analytics_app n'est pas disponible.
        """
        if self.decision != 'admis' or self.mention not in ('Bien', 'Très Bien'):
            return
        try:
            from apps.analytics_app.extensions_models import Badge, StudentBadge, Wallet, WalletTransaction
            badge, _ = Badge.objects.get_or_create(
                name='Excellence académique', type='excellence',
                defaults={
                    'description': "Décerné pour une mention Bien ou Très Bien à l'issue d'un semestre.",
                    'criteria': 'Moyenne semestrielle avec mention Bien ou Très Bien.',
                    'points': 50,
                },
            )
            student_badge, created = StudentBadge.objects.get_or_create(
                student=self.student, badge=badge,
                defaults={'reason': f"{self.semester} — mention {self.mention}"},
            )
            if created:
                wallet, _ = Wallet.objects.get_or_create(student=self.student)
                transaction = WalletTransaction.objects.create(
                    wallet=wallet, type='reward', amount=badge.points,
                    description=f"Badge Excellence académique — {self.semester}",
                    reference=str(student_badge.id),
                )
                wallet.balance += transaction.amount
                wallet.total_earned += transaction.amount
                wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])
        except Exception:
            pass


class Jury(BaseModel):
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='juries')
    president = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='jury_president')
    members = models.ManyToManyField(User, blank=True, related_name='jury_members')
    deliberation_date = models.DateTimeField(null=True, blank=True)
    pv_file = models.FileField(upload_to='deliberations/pv/', null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        db_table = 'juries'
        verbose_name = 'Jury'

    def __str__(self):
        return f"Jury — {self.exam_session}"


class GradeContest(BaseModel):
    STATUS_CHOICES = [
        ('soumise', 'Soumise'),
        ('en_cours', 'En cours d\'examen'),
        ('acceptee', 'Acceptée'),
        ('rejetee', 'Rejetée'),
    ]

    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='contests')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='soumise')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    response = models.TextField(blank=True)
    new_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'grade_contests'
        verbose_name = 'Réclamation de Note'

    def __str__(self):
        return f"Réclamation — {self.student} sur {self.grade.ec.code}"
