from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.programs.models import Program, Semester, UE, Group
from apps.people.models import Student


class AdminEnrollment(BaseModel):
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('validee', 'Validée'),
        ('rejetee', 'Rejetée'),
        ('annulee', 'Annulée'),
    ]

    TYPE_CHOICES = [
        ('premiere_inscription', 'Première inscription'),
        ('reinscription', 'Réinscription'),
        ('transfert', 'Transfert'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='admin_enrollments')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    program = models.ForeignKey(Program, on_delete=models.CASCADE)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='premiere_inscription')
    previous_program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True,
                                          related_name='+', help_text="Programme d'origine (transfert uniquement)")
    enrollment_number = models.CharField(max_length=20, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_enrollments')
    validated_at = models.DateTimeField(null=True, blank=True)
    payment_validated = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'admin_enrollments'
        unique_together = ('student', 'academic_year', 'program')
        verbose_name = 'Inscription Administrative'

    def __str__(self):
        return f"{self.enrollment_number} — {self.student}"

    def save(self, *args, **kwargs):
        if not self.enrollment_number:
            import uuid
            self.enrollment_number = f"INS-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class PedaEnrollment(BaseModel):
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirmee', 'Confirmée'),
        ('annulee', 'Annulée'),
    ]

    admin_enrollment = models.ForeignKey(AdminEnrollment, on_delete=models.CASCADE, related_name='peda_enrollments')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'peda_enrollments'
        unique_together = ('admin_enrollment', 'semester')
        verbose_name = 'Inscription Pédagogique'

    def __str__(self):
        return f"{self.admin_enrollment.student} — {self.semester}"


class UEEnrollment(BaseModel):
    peda_enrollment = models.ForeignKey(PedaEnrollment, on_delete=models.CASCADE, related_name='ue_enrollments')
    ue = models.ForeignKey(UE, on_delete=models.CASCADE)
    is_optional = models.BooleanField(default=False)
    prerequisite_waived = models.BooleanField(default=False)
    waiver_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'ue_enrollments'
        unique_together = ('peda_enrollment', 'ue')
        verbose_name = 'Inscription UE'

    def __str__(self):
        return f"{self.peda_enrollment.admin_enrollment.student} — {self.ue.code}"
