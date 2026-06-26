"""
Système avancé de gestion des absences et justificatifs
"""
from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student
from apps.attendance.models import AttendanceRecord


class AbsenceJustification(BaseModel):
    """Justificatif d'absence soumis par l'étudiant"""
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('needs_info', 'Informations manquantes'),
    ]
    
    REASON_CHOICES = [
        ('medical', 'Raison médicale'),
        ('family', 'Raison familiale'),
        ('administrative', 'Démarche administrative'),
        ('transport', 'Problème de transport'),
        ('technical', 'Problème technique'),
        ('other', 'Autre'),
    ]
    
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='justifications'
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='justifications')
    
    # Détails du justificatif
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    description = models.TextField()
    supporting_document = models.FileField(
        upload_to='attendance/justifications/%Y/%m/',
        null=True,
        blank=True
    )
    
    # Validation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_justifications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_comment = models.TextField(blank=True)
    
    # Métadonnées
    submitted_at = models.DateTimeField(auto_now_add=True)
    auto_approved = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'absence_justifications'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'submitted_at']),
        ]
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.get_reason_display()} ({self.status})"


class AttendanceAlert(BaseModel):
    """Alertes automatiques pour absences répétées"""
    
    ALERT_TYPE_CHOICES = [
        ('warning', 'Avertissement'),
        ('critical', 'Critique'),
        ('exclusion_risk', 'Risque d\'exclusion'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_alerts')
    course_space = models.ForeignKey('lms.CourseSpace', on_delete=models.CASCADE)
    
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    absence_count = models.PositiveSmallIntegerField()
    attendance_rate = models.DecimalField(max_digits=5, decimal_places=2)
    threshold_exceeded = models.CharField(max_length=100)
    
    # Actions
    notification_sent = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    parent_notified = models.BooleanField(default=False)
    teacher_notified = models.BooleanField(default=False)
    
    # Suivi
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True)
    
    class Meta:
        db_table = 'attendance_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'resolved']),
            models.Index(fields=['alert_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.get_alert_type_display()}"


class AttendancePolicy(BaseModel):
    """Politique d'assiduité par cours ou programme"""
    
    course_space = models.ForeignKey(
        'lms.CourseSpace',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attendance_policies'
    )
    program = models.ForeignKey(
        'programs.Program',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attendance_policies'
    )
    
    # Seuils
    min_attendance_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=75.0,
        help_text="Taux minimum requis (%)"
    )
    max_absences_allowed = models.PositiveSmallIntegerField(
        default=3,
        help_text="Nombre maximum d'absences non justifiées"
    )
    
    # Alertes
    warning_threshold = models.PositiveSmallIntegerField(
        default=2,
        help_text="Nombre d'absences avant avertissement"
    )
    critical_threshold = models.PositiveSmallIntegerField(
        default=4,
        help_text="Nombre d'absences avant alerte critique"
    )
    
    # Actions automatiques
    auto_notify_student = models.BooleanField(default=True)
    auto_notify_teacher = models.BooleanField(default=True)
    auto_notify_parent = models.BooleanField(default=False)
    
    # Justificatifs
    require_justification = models.BooleanField(default=True)
    justification_deadline_days = models.PositiveSmallIntegerField(
        default=3,
        help_text="Délai pour soumettre un justificatif (jours)"
    )
    auto_approve_medical = models.BooleanField(
        default=False,
        help_text="Approuver automatiquement les certificats médicaux"
    )
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'attendance_policies'
        verbose_name = 'Politique d\'Assiduité'
        verbose_name_plural = 'Politiques d\'Assiduité'
    
    def __str__(self):
        if self.course_space:
            return f"Politique - {self.course_space.title}"
        elif self.program:
            return f"Politique - {self.program.name}"
        return "Politique générale"


class LateArrival(BaseModel):
    """Enregistrement des retards"""
    
    attendance_record = models.OneToOneField(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='late_arrival'
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='late_arrivals')
    
    minutes_late = models.PositiveSmallIntegerField()
    reason = models.TextField(blank=True)
    is_excused = models.BooleanField(default=False)
    
    # Validation
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'late_arrivals'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.minutes_late} min de retard"
