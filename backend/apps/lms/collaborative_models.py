"""
Espace collaboratif étudiant
"""
from django.db import models
from django.core.validators import FileExtensionValidator
from apps.core.models import BaseModel
from apps.people.models import Student
from apps.lms.models import CourseSpace
from apps.academic.models import AcademicYear


class StudyGroup(BaseModel):
    """Groupe d'étude entre étudiants"""
    
    STATUS_CHOICES = [
        ('open', 'Ouvert'),
        ('closed', 'Fermé'),
        ('full', 'Complet'),
        ('archived', 'Archivé'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    course_space = models.ForeignKey(
        CourseSpace,
        on_delete=models.CASCADE,
        related_name='study_groups',
        null=True,
        blank=True
    )
    
    # Configuration
    max_members = models.PositiveSmallIntegerField(default=10)
    is_public = models.BooleanField(default=True, help_text="Visible par tous les étudiants")
    requires_approval = models.BooleanField(default=False)
    
    # Métadonnées
    created_by = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='created_study_groups')
    members = models.ManyToManyField(Student, through='StudyGroupMembership', related_name='study_groups')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Statistiques
    total_members = models.PositiveSmallIntegerField(default=0)
    total_resources = models.PositiveIntegerField(default=0)
    total_sessions = models.PositiveIntegerField(default=0)
    
    # Tags
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'study_groups'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'is_public']),
            models.Index(fields=['course_space']),
        ]
    
    def __str__(self):
        return self.name


class StudyGroupMembership(BaseModel):
    """Appartenance à un groupe d'étude"""
    
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('moderator', 'Modérateur'),
        ('member', 'Membre'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('active', 'Actif'),
        ('inactive', 'Inactif'),
        ('banned', 'Banni'),
    ]
    
    study_group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    joined_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'study_group_memberships'
        unique_together = ('study_group', 'student')
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.study_group.name}"


class SharedResource(BaseModel):
    """Ressource partagée par les étudiants"""
    
    RESOURCE_TYPE_CHOICES = [
        ('notes', 'Notes de cours'),
        ('summary', 'Résumé'),
        ('exercise', 'Exercices'),
        ('correction', 'Correction'),
        ('slides', 'Diapositives'),
        ('video', 'Vidéo'),
        ('link', 'Lien externe'),
        ('other', 'Autre'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES)
    
    # Fichier ou lien
    file = models.FileField(
        upload_to='collaborative/resources/%Y/%m/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip']
        )]
    )
    external_url = models.URLField(blank=True)
    
    # Contexte
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='shared_resources')
    study_group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='resources',
        null=True,
        blank=True
    )
    
    # Auteur
    shared_by = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='shared_resources')
    
    # Modération
    is_approved = models.BooleanField(default=True)
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True)
    
    # Statistiques
    download_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    
    # Tags
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'shared_resources'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course_space', 'is_approved']),
            models.Index(fields=['resource_type']),
        ]
    
    def __str__(self):
        return self.title


class ResourceRating(BaseModel):
    """Évaluation d'une ressource partagée"""
    
    resource = models.ForeignKey(SharedResource, on_delete=models.CASCADE, related_name='ratings')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    
    rating = models.PositiveSmallIntegerField(
        validators=[models.validators.MinValueValidator(1), models.validators.MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    
    is_helpful = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'resource_ratings'
        unique_together = ('resource', 'student')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.resource.title} - {self.rating}/5"


class PeerTutoring(BaseModel):
    """Tutorat entre pairs"""
    
    STATUS_CHOICES = [
        ('requested', 'Demandé'),
        ('accepted', 'Accepté'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
    ]
    
    # Participants
    tutee = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='tutoring_as_tutee',
        help_text="Étudiant demandant de l'aide"
    )
    tutor = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='tutoring_as_tutor',
        null=True,
        blank=True,
        help_text="Étudiant offrant de l'aide"
    )
    
    # Détails
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE)
    topic = models.CharField(max_length=200)
    description = models.TextField()
    
    # Planification
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    is_online = models.BooleanField(default=True)
    meeting_link = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    
    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    
    # Feedback
    tutee_rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[models.validators.MinValueValidator(1), models.validators.MaxValueValidator(5)]
    )
    tutee_feedback = models.TextField(blank=True)
    tutor_rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[models.validators.MinValueValidator(1), models.validators.MaxValueValidator(5)]
    )
    tutor_feedback = models.TextField(blank=True)
    
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'peer_tutoring'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'course_space']),
            models.Index(fields=['tutor', 'status']),
        ]
    
    def __str__(self):
        return f"{self.topic} - {self.tutee.user.get_full_name()}"


class TutorProfile(BaseModel):
    """Profil de tuteur étudiant"""
    
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='tutor_profile')
    
    # Disponibilité
    is_available = models.BooleanField(default=True)
    bio = models.TextField(blank=True)
    
    # Compétences
    courses = models.ManyToManyField(CourseSpace, related_name='tutors')
    specialties = models.JSONField(default=list, blank=True)
    
    # Statistiques
    total_sessions = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_hours = models.PositiveIntegerField(default=0)
    
    # Préférences
    max_tutees_per_week = models.PositiveSmallIntegerField(default=5)
    preferred_online = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'tutor_profiles'
    
    def __str__(self):
        return f"Tuteur - {self.student.user.get_full_name()}"


class StudySession(BaseModel):
    """Session d'étude de groupe"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Planifiée'),
        ('ongoing', 'En cours'),
        ('completed', 'Terminée'),
        ('cancelled', 'Annulée'),
    ]
    
    study_group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='sessions')
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Planification
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=120)
    
    # Lieu
    is_online = models.BooleanField(default=True)
    meeting_link = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    
    # Participants
    organizer = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='organized_sessions')
    participants = models.ManyToManyField(Student, through='SessionParticipation', related_name='study_sessions')
    
    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Contenu
    agenda = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'study_sessions'
        ordering = ['scheduled_date', 'scheduled_time']
        indexes = [
            models.Index(fields=['study_group', 'status']),
            models.Index(fields=['scheduled_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.scheduled_date}"


class SessionParticipation(BaseModel):
    """Participation à une session d'étude"""
    
    STATUS_CHOICES = [
        ('confirmed', 'Confirmé'),
        ('maybe', 'Peut-être'),
        ('declined', 'Décliné'),
        ('attended', 'Présent'),
        ('absent', 'Absent'),
    ]
    
    session = models.ForeignKey(StudySession, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'session_participations'
        unique_together = ('session', 'student')
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.session.title}"


class CollaborativeNote(BaseModel):
    """Note collaborative partagée"""
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='collaborative_notes')
    study_group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='notes',
        null=True,
        blank=True
    )
    
    # Auteurs
    created_by = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='created_notes')
    contributors = models.ManyToManyField(Student, related_name='contributed_notes', blank=True)
    
    # Versioning
    version = models.PositiveSmallIntegerField(default=1)
    last_edited_by = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        related_name='last_edited_notes'
    )
    last_edited_at = models.DateTimeField(auto_now=True)
    
    # Permissions
    is_public = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'collaborative_notes'
        ordering = ['-last_edited_at']
        indexes = [
            models.Index(fields=['course_space', 'is_public']),
        ]
    
    def __str__(self):
        return self.title
