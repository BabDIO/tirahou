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


class Grade(BaseModel):
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
        """Calcule automatiquement la note finale avec pondérations, bonus et pénalités"""
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
        """Publier la note à l'étudiant avec notification"""
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


class UEResult(BaseModel):
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
    
    # AMÉLIORATIONS: Calcul automatique et détails
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
        """Calcule la moyenne de l'UE à partir des notes des EC"""
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
        
        # Déterminer la décision
        if self.average >= 10:
            self.decision = 'valide'
            self.credits_obtained = self.ue.credits
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
        """Calcule la moyenne du semestre à partir des résultats des UE"""
        ue_results = UEResult.objects.filter(
            student=self.student,
            ue__semester=self.semester,
            exam_session=self.exam_session
        ).select_related('ue')
        
        if not ue_results.exists():
            return None
        
        # Calcul pondéré par les crédits
        total_weighted = 0
        total_credits = 0
        validated = 0
        failed = 0
        
        for ue_result in ue_results:
            if ue_result.average is not None:
                credits = ue_result.ue.credits
                total_weighted += float(ue_result.average) * credits
                total_credits += credits
                
                if ue_result.decision == 'valide':
                    validated += 1
                    self.credits_obtained += ue_result.credits_obtained
                else:
                    failed += 1
        
        if total_credits == 0:
            return None
        
        self.average = round(total_weighted / total_credits, 2)
        self.total_credits = total_credits
        self.ues_validated = validated
        self.ues_failed = failed
        
        # Calculer le GPA (0-4)
        self.gpa = round((float(self.average) / 20) * 4, 2)
        
        # Déterminer la mention
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
        
        # Déterminer la décision
        if self.average >= 10 and failed == 0:
            self.decision = 'admis'
        elif self.average >= 10 and failed <= 2:  # Compensation possible
            self.decision = 'admis'
        else:
            self.decision = 'ajourné'
        
        self.save()
        return self.average
    
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
