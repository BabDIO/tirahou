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
