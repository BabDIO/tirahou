from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import Department, AcademicYear
from apps.programs.models import Program


class Student(BaseModel):
    GENDER_CHOICES = [('M', 'Masculin'), ('F', 'Féminin'), ('A', 'Autre')]

    STATUS_CHOICES = [
        ('candidat', 'Candidat'),
        ('admis', 'Admis'),
        ('inscrit', 'Inscrit'),
        ('reinscrit', 'Réinscrit'),
        ('diplome', 'Diplômé'),
        ('abandonne', 'Abandonné'),
        ('exclu', 'Exclu'),
        ('suspendu', 'Suspendu'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    national_id = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    birth_date = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=100, blank=True)
    nationality = models.CharField(max_length=100, default='Ivoirienne')
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)
    current_program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    current_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True)
    current_level = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='candidat')
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    baccalaureate_year = models.PositiveSmallIntegerField(null=True, blank=True)
    baccalaureate_series = models.CharField(max_length=20, blank=True)
    baccalaureate_mention = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'students'
        verbose_name = 'Étudiant'

    def __str__(self):
        return f"{self.student_id} — {self.user.get_full_name()}"


class Teacher(BaseModel):
    GRADE_CHOICES = [
        ('assistant', 'Assistant'),
        ('maitre_assistant', 'Maître-Assistant'),
        ('maitre_conference', 'Maître de Conférences'),
        ('professeur', 'Professeur'),
        ('vacataire', 'Vacataire'),
        ('invite', 'Invité'),
    ]

    STATUS_CHOICES = [
        ('permanent', 'Permanent'),
        ('vacataire', 'Vacataire'),
        ('invite', 'Invité'),
        ('emerite', 'Émérite'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    teacher_id = models.CharField(max_length=20, unique=True)
    grade = models.CharField(max_length=30, choices=GRADE_CHOICES, default='assistant')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='permanent')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='teachers')
    specialities = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    office = models.CharField(max_length=50, blank=True)
    weekly_hours_quota = models.PositiveSmallIntegerField(default=8)
    # Référentiel intervenants externes / vacataires
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
                                       help_text="Taux horaire (vacataires/invités)")
    contract_reference = models.CharField(max_length=100, blank=True,
                                           help_text="Référence de contrat (vacataires/invités)")

    class Meta:
        db_table = 'teachers'
        verbose_name = 'Enseignant'

    def __str__(self):
        return f"{self.teacher_id} — {self.user.get_full_name()}"


class AdminStaff(BaseModel):
    SERVICE_CHOICES = [
        ('scolarite', 'Scolarité'),
        ('finance', 'Finance'),
        ('rh', 'Ressources Humaines'),
        ('informatique', 'Informatique'),
        ('bibliotheque', 'Bibliothèque'),
        ('direction', 'Direction'),
        ('autre', 'Autre'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    staff_id = models.CharField(max_length=20, unique=True)
    service = models.CharField(max_length=30, choices=SERVICE_CHOICES)
    position = models.CharField(max_length=100, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'admin_staff'
        verbose_name = 'Personnel Administratif'

    def __str__(self):
        return f"{self.staff_id} — {self.user.get_full_name()}"


class ParentGuardian(BaseModel):
    """Parent ou tuteur légal d'un étudiant"""
    RELATIONSHIP_CHOICES = [
        ('pere', 'Père'),
        ('mere', 'Mère'),
        ('tuteur_legal', 'Tuteur légal'),
        ('oncle', 'Oncle'),
        ('tante', 'Tante'),
        ('grand_parent', 'Grand-parent'),
        ('autre', 'Autre'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='parents_guardians')
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    
    # Informations personnelles
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    phone_secondary = models.CharField(max_length=20, blank=True, verbose_name="Téléphone secondaire")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(max_length=100, default="Côte d'Ivoire", verbose_name="Pays")
    
    # Informations professionnelles
    profession = models.CharField(max_length=100, blank=True, verbose_name="Profession")
    employer = models.CharField(max_length=200, blank=True, verbose_name="Employeur")
    
    # Préférences de notification
    can_receive_notifications = models.BooleanField(default=True, verbose_name="Peut recevoir des notifications")
    notification_preferences = models.JSONField(default=dict, blank=True, help_text="Types de notifications autorisées")
    
    # Contact prioritaire
    is_primary_contact = models.BooleanField(default=False, verbose_name="Contact prioritaire")
    is_emergency_contact = models.BooleanField(default=True, verbose_name="Contact d'urgence")
    
    # Informations légales
    has_legal_authority = models.BooleanField(default=True, verbose_name="Autorité légale")
    id_card_number = models.CharField(max_length=50, blank=True, verbose_name="Numéro pièce d'identité")
    
    class Meta:
        db_table = 'parent_guardians'
        verbose_name = "Parent/Tuteur"
        verbose_name_plural = "Parents/Tuteurs"
        ordering = ['-is_primary_contact', 'last_name', 'first_name']
        
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_relationship_display()}) - {self.student.user.get_full_name()}"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_notification_types(self):
        """Retourne les types de notifications activés"""
        if not self.can_receive_notifications:
            return []
        
        default_prefs = {
            'absences': True,
            'notes': True,
            'paiements': True,
            'discipline': True,
            'annonces': False,
            'resultats': True
        }
        
        prefs = {**default_prefs, **self.notification_preferences}
        return [key for key, value in prefs.items() if value]
    
    def can_receive_notification_type(self, notification_type):
        """Vérifie si le parent peut recevoir ce type de notification"""
        if not self.can_receive_notifications:
            return False
        return notification_type in self.get_notification_types()


class TeacherAvailability(BaseModel):
    """Créneaux de disponibilité déclarés par un enseignant (pour la planification)."""
    DAY_CHOICES = [
        (0, 'Lundi'), (1, 'Mardi'), (2, 'Mercredi'), (3, 'Jeudi'),
        (4, 'Vendredi'), (5, 'Samedi'), (6, 'Dimanche'),
    ]

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.PositiveSmallIntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'teacher_availabilities'
        ordering = ['day_of_week', 'start_time']
        verbose_name = 'Disponibilité Enseignant'

    def __str__(self):
        return f"{self.teacher} — {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"
