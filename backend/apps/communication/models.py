from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.lms.models import CourseSpace


class Notification(BaseModel):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('alerte', 'Alerte'),
        ('rappel', 'Rappel'),
        ('resultat', 'Résultat'),
        ('paiement', 'Paiement'),
        ('inscription', 'Inscription'),
        ('cours', 'Cours'),
        ('absence', 'Absence'),
        ('document', 'Document'),
    ]

    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push'),
        ('interne', 'Interne'),
    ]
    
    # AMÉLIORATION: Priorités
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='interne')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')  # NOUVEAU
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(max_length=300, blank=True)
    action_label = models.CharField(max_length=100, blank=True)  # NOUVEAU
    icon = models.CharField(max_length=50, blank=True)  # NOUVEAU
    color = models.CharField(max_length=20, blank=True)  # NOUVEAU
    sent_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    extra_data = models.JSONField(default=dict, blank=True)  # NOUVEAU

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        verbose_name = 'Notification'

    def __str__(self):
        return f"{self.recipient} — {self.title}"


class Announcement(BaseModel):
    AUDIENCE_CHOICES = [
        ('tous', 'Tous'),
        ('etudiants', 'Étudiants'),
        ('enseignants', 'Enseignants'),
        ('personnel', 'Personnel'),
        ('cours', 'Cours spécifique'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='tous')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.SET_NULL, null=True, blank=True, related_name='announcements')
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_pinned = models.BooleanField(default=False)
    attachment = models.FileField(upload_to='announcements/', null=True, blank=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-is_pinned', '-published_at']
        verbose_name = 'Annonce'

    def __str__(self):
        return self.title


class Message(BaseModel):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    attachment = models.FileField(upload_to='messages/', null=True, blank=True)

    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']
        verbose_name = 'Message'

    def __str__(self):
        return f"{self.sender} → {self.recipient} : {self.subject}"


class Forum(BaseModel):
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='forums')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_open = models.BooleanField(default=True)

    class Meta:
        db_table = 'forums'
        verbose_name = 'Forum'

    def __str__(self):
        return f"{self.course_space} — {self.title}"


class ForumPost(BaseModel):
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_pinned = models.BooleanField(default=False)
    attachment = models.FileField(upload_to='forums/', null=True, blank=True)

    class Meta:
        db_table = 'forum_posts'
        ordering = ['created_at']
        verbose_name = 'Post de Forum'

    def __str__(self):
        return f"{self.forum} — {self.author} : {self.content[:50]}"
