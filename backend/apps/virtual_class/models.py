from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.lms.models import CourseSpace
from apps.people.models import Student


class VirtualClassSession(BaseModel):
    PROVIDER_CHOICES = [
        ('bbb', 'BigBlueButton'),
        ('jitsi', 'Jitsi Meet'),
        ('zoom', 'Zoom'),
        ('meet', 'Google Meet'),
        ('teams', 'Microsoft Teams'),
        ('autre', 'Autre'),
    ]

    MODE_CHOICES = [
        ('presentiel', 'Présentiel'),
        ('distanciel_sync', 'Distanciel Synchrone'),
        ('hybride', 'Hybride'),
    ]

    STATUS_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='virtual_sessions')
    scheduled_session = models.ForeignKey('scheduling_app.ScheduledSession', on_delete=models.SET_NULL, null=True, blank=True,
                                           related_name='virtual_class_sessions',
                                           help_text="Créneau physique correspondant (mode hybride) — permet de fusionner la présence salle + en ligne")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='hybride')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='bbb')
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    meeting_id = models.CharField(max_length=200, blank=True)
    join_url = models.URLField(blank=True)
    moderator_password = models.CharField(max_length=100, blank=True)
    attendee_password = models.CharField(max_length=100, blank=True)
    recording_url = models.URLField(blank=True)
    is_recorded = models.BooleanField(default=False)
    replay_available = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planifiee')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_sessions')
    room_capacity = models.PositiveSmallIntegerField(default=100)
    physical_room = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'virtual_class_sessions'
        ordering = ['scheduled_start']
        verbose_name = 'Session de Classe Virtuelle'

    def __str__(self):
        return f"{self.course_space} — {self.title} ({self.scheduled_start.date()})"


class SessionParticipant(BaseModel):
    ROLE_CHOICES = [
        ('moderateur', 'Modérateur'),
        ('presentateur', 'Présentateur'),
        ('participant', 'Participant'),
    ]

    session = models.ForeignKey(VirtualClassSession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=0)
    is_present = models.BooleanField(default=False)
    join_mode = models.CharField(max_length=20, choices=[('online', 'En ligne'), ('physical', 'En salle')], default='online')

    class Meta:
        db_table = 'session_participants'
        unique_together = ('session', 'user')
        verbose_name = 'Participant à la Session'

    def __str__(self):
        return f"{self.user} — {self.session.title}"
