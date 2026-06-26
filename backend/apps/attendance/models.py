from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student
from apps.scheduling_app.models import ScheduledSession


class AttendanceSheet(BaseModel):
    session = models.OneToOneField(ScheduledSession, on_delete=models.CASCADE, related_name='attendance_sheet')
    qr_code = models.ImageField(upload_to='attendance/qrcodes/', null=True, blank=True)
    session_code = models.CharField(max_length=10, unique=True, blank=True)
    is_open = models.BooleanField(default=False)
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'attendance_sheets'
        verbose_name = 'Feuille de Présence'

    def __str__(self):
        return f"Présence — {self.session}"

    def save(self, *args, **kwargs):
        if not self.session_code:
            import random, string
            self.session_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        super().save(*args, **kwargs)


class AttendanceRecord(BaseModel):
    STATUS_CHOICES = [
        ('present', 'Présent'),
        ('absent', 'Absent'),
        ('retard', 'En retard'),
        ('excuse', 'Excusé'),
    ]

    METHOD_CHOICES = [
        ('qr_code', 'QR Code'),
        ('code_seance', 'Code de séance'),
        ('manuel', 'Manuel'),
        ('virtuel', 'Classe virtuelle'),
    ]
    
    # AMÉLIORATION: Statut de justification
    JUSTIFICATION_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('not_required', 'Non requis'),
    ]

    sheet = models.ForeignKey(AttendanceSheet, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='absent')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='manuel')
    marked_at = models.DateTimeField(null=True, blank=True)
    justification = models.TextField(blank=True)
    justification_file = models.FileField(upload_to='attendance/justifications/', null=True, blank=True)
    is_justified = models.BooleanField(default=False)
    justification_status = models.CharField(max_length=20, choices=JUSTIFICATION_STATUS_CHOICES, default='not_required')  # NOUVEAU
    justification_reason = models.CharField(max_length=50, blank=True)  # NOUVEAU: medical, family, etc.
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_absences')  # NOUVEAU
    reviewed_at = models.DateTimeField(null=True, blank=True)  # NOUVEAU
    reviewer_comment = models.TextField(blank=True)  # NOUVEAU
    minutes_late = models.PositiveSmallIntegerField(default=0, help_text="Minutes de retard")  # NOUVEAU

    class Meta:
        db_table = 'attendance_records'
        unique_together = ('sheet', 'student')
        verbose_name = 'Enregistrement de Présence'

    def __str__(self):
        return f"{self.student} — {self.sheet.session} : {self.get_status_display()}"


class AbsenceSummary(BaseModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='absence_summaries')
    course_space = models.ForeignKey('lms.CourseSpace', on_delete=models.CASCADE)
    total_sessions = models.PositiveSmallIntegerField(default=0)
    present_count = models.PositiveSmallIntegerField(default=0)
    absent_count = models.PositiveSmallIntegerField(default=0)
    justified_count = models.PositiveSmallIntegerField(default=0)
    attendance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    alert_sent = models.BooleanField(default=False)
    
    # AMÉLIORATION: Alertes et seuils
    late_count = models.PositiveSmallIntegerField(default=0)  # NOUVEAU
    unjustified_count = models.PositiveSmallIntegerField(default=0)  # NOUVEAU
    punctuality_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # NOUVEAU
    alert_level = models.CharField(max_length=20, default='none', choices=[  # NOUVEAU
        ('none', 'Aucune'),
        ('warning', 'Avertissement'),
        ('critical', 'Critique'),
        ('exclusion_risk', 'Risque d\'exclusion'),
    ])
    last_alert_sent = models.DateTimeField(null=True, blank=True)  # NOUVEAU
    recommendations = models.JSONField(default=list, blank=True)  # NOUVEAU

    class Meta:
        db_table = 'absence_summaries'
        unique_together = ('student', 'course_space')
        verbose_name = 'Résumé d\'Assiduité'

    def __str__(self):
        return f"{self.student} — {self.course_space} : {self.attendance_rate}%"
