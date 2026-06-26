from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User


class University(BaseModel):
    name = models.CharField(max_length=200)
    acronym = models.CharField(max_length=20)
    logo = models.ImageField(upload_to='university/', null=True, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    rector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='rector_of')

    class Meta:
        db_table = 'universities'
        verbose_name = 'Université'

    def __str__(self):
        return self.acronym


class Faculty(BaseModel):
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='faculties')
    name = models.CharField(max_length=200)
    acronym = models.CharField(max_length=20)
    dean = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dean_of')
    email = models.EmailField(blank=True)

    class Meta:
        db_table = 'faculties'
        verbose_name = 'Faculté / École / Institut'

    def __str__(self):
        return f"{self.acronym} — {self.university.acronym}"


class Department(BaseModel):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=200)
    acronym = models.CharField(max_length=20)
    head = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='head_of_dept')

    class Meta:
        db_table = 'departments'
        verbose_name = 'Département / DER'

    def __str__(self):
        return f"{self.acronym} — {self.faculty.acronym}"


class AcademicYear(BaseModel):
    label = models.CharField(max_length=20)  # ex: 2024-2025
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    # Périodes clés
    candidature_start = models.DateField(null=True, blank=True)
    candidature_end = models.DateField(null=True, blank=True)
    admin_enrollment_start = models.DateField(null=True, blank=True)
    admin_enrollment_end = models.DateField(null=True, blank=True)
    peda_enrollment_start = models.DateField(null=True, blank=True)
    peda_enrollment_end = models.DateField(null=True, blank=True)
    courses_start = models.DateField(null=True, blank=True)
    courses_end = models.DateField(null=True, blank=True)
    exams_start = models.DateField(null=True, blank=True)
    exams_end = models.DateField(null=True, blank=True)
    deliberation_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'academic_years'
        verbose_name = 'Année Académique'
        ordering = ['-start_date']

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class LMDRegulation(BaseModel):
    CYCLE_CHOICES = [
        ('licence', 'Licence'),
        ('licence_pro', 'Licence Professionnelle'),
        ('master', 'Master'),
        ('doctorat', 'Doctorat'),
        ('du', 'Diplôme Universitaire'),
        ('certificat', 'Certificat'),
    ]

    name = models.CharField(max_length=200)
    cycle = models.CharField(max_length=20, choices=CYCLE_CHOICES)
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='regulations')
    effective_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True)
    # Règles de validation
    credits_per_semester = models.PositiveSmallIntegerField(default=30)
    credits_per_year = models.PositiveSmallIntegerField(default=60)
    total_credits = models.PositiveSmallIntegerField(default=180)
    passing_grade = models.DecimalField(max_digits=4, decimal_places=2, default=10.00)
    compensation_allowed = models.BooleanField(default=True)
    compensation_min_grade = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)
    max_years_allowed = models.PositiveSmallIntegerField(default=5)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'lmd_regulations'
        verbose_name = 'Règlement LMD'

    def __str__(self):
        return f"{self.name} ({self.get_cycle_display()})"
