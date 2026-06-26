from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import Department, AcademicYear, LMDRegulation


class Program(BaseModel):
    TYPE_CHOICES = [
        ('licence', 'Licence'),
        ('licence_pro', 'Licence Professionnelle'),
        ('master', 'Master'),
        ('doctorat', 'Doctorat'),
        ('du', 'Diplôme Universitaire'),
        ('certificat', 'Certificat'),
        ('micro_cert', 'Micro-Certification'),
    ]

    MODE_CHOICES = [
        ('presentiel', 'Présentiel'),
        ('distanciel', 'Distanciel'),
        ('hybride', 'Hybride'),
    ]

    STATUS_CHOICES = [
        ('preparation', 'En préparation'),
        ('active', 'Active'),
        ('suspendue', 'Suspendue'),
        ('archivee', 'Archivée'),
    ]

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='hybride')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='programs')
    regulation = models.ForeignKey(LMDRegulation, on_delete=models.SET_NULL, null=True)
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='responsible_programs')
    duration_semesters = models.PositiveSmallIntegerField(default=6)
    languages = models.CharField(max_length=100, default='Français')
    prerequisites = models.TextField(blank=True)
    capacity = models.PositiveIntegerField(default=50)
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparation')
    description = models.TextField(blank=True)
    candidature_open = models.BooleanField(default=False)

    class Meta:
        db_table = 'programs'
        verbose_name = 'Programme / Formation'

    def __str__(self):
        return f"{self.code} — {self.name}"


class Semester(BaseModel):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='semesters')
    number = models.PositiveSmallIntegerField()  # S1, S2, ...
    label = models.CharField(max_length=50)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True)
    total_credits = models.PositiveSmallIntegerField(default=30)

    class Meta:
        db_table = 'semesters'
        unique_together = ('program', 'number')
        ordering = ['number']

    def __str__(self):
        return f"{self.program.code} — S{self.number}"


class UE(BaseModel):
    TYPE_CHOICES = [
        ('fondamentale', 'Fondamentale'),
        ('transversale', 'Transversale'),
        ('optionnelle', 'Optionnelle'),
        ('libre', 'Libre'),
    ]

    EVAL_MODE_CHOICES = [
        ('controle_continu', 'Contrôle Continu'),
        ('examen_final', 'Examen Final'),
        ('mixte', 'Mixte CC + Examen'),
    ]

    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='ues')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='fondamentale')
    credits = models.PositiveSmallIntegerField(default=3)
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    volume_hours = models.PositiveSmallIntegerField(default=45)
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='responsible_ues')
    eval_mode = models.CharField(max_length=20, choices=EVAL_MODE_CHOICES, default='mixte')
    compensation_allowed = models.BooleanField(default=True)
    passing_grade = models.DecimalField(max_digits=4, decimal_places=2, default=10.00)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'ues'
        unique_together = ('semester', 'code')
        verbose_name = 'Unité d\'Enseignement'

    def __str__(self):
        return f"{self.code} — {self.name}"


class EC(BaseModel):
    ACTIVITY_CHOICES = [
        ('cm', 'Cours Magistral'),
        ('td', 'Travaux Dirigés'),
        ('tp', 'Travaux Pratiques'),
        ('projet', 'Projet'),
        ('stage', 'Stage'),
        ('seminaire', 'Séminaire'),
        ('atelier', 'Atelier'),
        ('classe_virtuelle', 'Classe Virtuelle'),
        ('asynchrone', 'Activité Asynchrone'),
    ]

    ue = models.ForeignKey(UE, on_delete=models.CASCADE, related_name='ecs')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='cm')
    volume_hours = models.PositiveSmallIntegerField(default=15)
    credits = models.PositiveSmallIntegerField(default=1)
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    teachers = models.ManyToManyField(User, blank=True, related_name='teaching_ecs')

    class Meta:
        db_table = 'ecs'
        unique_together = ('ue', 'code')
        verbose_name = 'Élément Constitutif'

    def __str__(self):
        return f"{self.code} — {self.name}"


class Group(BaseModel):
    TYPE_CHOICES = [
        ('promotion', 'Promotion'),
        ('td', 'Groupe TD'),
        ('tp', 'Groupe TP'),
    ]

    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='groups')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='promotion')
    capacity = models.PositiveSmallIntegerField(default=30)

    class Meta:
        db_table = 'groups'
        verbose_name = 'Groupe / Promotion'

    def __str__(self):
        return f"{self.program.code} — {self.name} ({self.academic_year})"
