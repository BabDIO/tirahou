from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.programs.models import EC, Group


class Room(BaseModel):
    TYPE_CHOICES = [
        ('amphi', 'Amphithéâtre'),
        ('salle_cours', 'Salle de cours'),
        ('salle_td', 'Salle TD'),
        ('labo', 'Laboratoire'),
        ('salle_info', 'Salle informatique'),
        ('virtuelle', 'Salle virtuelle'),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    capacity = models.PositiveSmallIntegerField(default=30)
    building = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=20, blank=True)
    has_projector = models.BooleanField(default=False)
    has_computer = models.BooleanField(default=False)
    has_internet = models.BooleanField(default=False)
    is_virtual = models.BooleanField(default=False)

    class Meta:
        db_table = 'rooms'
        verbose_name = 'Salle'

    def __str__(self):
        return f"{self.code} — {self.name} ({self.capacity} places)"


class ScheduledSession(BaseModel):
    MODE_CHOICES = [
        ('presentiel', 'Présentiel'),
        ('distanciel_sync', 'Distanciel Synchrone'),
        ('distanciel_async', 'Distanciel Asynchrone'),
        ('hybride', 'Hybride'),
    ]

    STATUS_CHOICES = [
        ('planifie', 'Planifié'),
        ('confirme', 'Confirmé'),
        ('annule', 'Annulé'),
        ('reporte', 'Reporté'),
        ('realise', 'Réalisé'),
    ]

    ec = models.ForeignKey(EC, on_delete=models.CASCADE, related_name='scheduled_sessions')
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='teaching_sessions')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='presentiel')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planifie')
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    rescheduled_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'scheduled_sessions'
        ordering = ['start_datetime']
        verbose_name = 'Séance Planifiée'

    def __str__(self):
        return f"{self.ec.code} — {self.start_datetime.strftime('%d/%m/%Y %H:%M')}"


class Timetable(BaseModel):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='timetables')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    week_number = models.PositiveSmallIntegerField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    sessions = models.ManyToManyField(ScheduledSession, blank=True)

    class Meta:
        db_table = 'timetables'
        verbose_name = 'Emploi du Temps'

    def __str__(self):
        return f"EDT — {self.group} ({self.academic_year})"
