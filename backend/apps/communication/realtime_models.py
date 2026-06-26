"""
Système de notifications en temps réel
"""
from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User


class RealtimeNotification(BaseModel):
    """Notifications temps réel avec support WebSocket"""
    
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]
    
    CHANNEL_CHOICES = [
        ('in_app', 'Application'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push navigateur'),
        ('all', 'Tous les canaux'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='realtime_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='in_app')
    
    # Métadonnées
    action_url = models.CharField(max_length=500, blank=True)
    action_label = models.CharField(max_length=100, blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    
    # État
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Données supplémentaires
    extra_data = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'realtime_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['priority', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.recipient.get_full_name()} - {self.title}"


class NotificationPreference(BaseModel):
    """Préférences de notification par utilisateur"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Canaux activés
    enable_email = models.BooleanField(default=True)
    enable_sms = models.BooleanField(default=False)
    enable_push = models.BooleanField(default=True)
    enable_in_app = models.BooleanField(default=True)
    
    # Types de notifications
    notify_grades = models.BooleanField(default=True)
    notify_assignments = models.BooleanField(default=True)
    notify_attendance = models.BooleanField(default=True)
    notify_payments = models.BooleanField(default=True)
    notify_announcements = models.BooleanField(default=True)
    notify_messages = models.BooleanField(default=True)
    notify_courses = models.BooleanField(default=True)
    
    # Horaires
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    # Fréquence
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ('instant', 'Instantané'),
            ('hourly', 'Toutes les heures'),
            ('daily', 'Quotidien'),
            ('weekly', 'Hebdomadaire'),
        ],
        default='instant'
    )
    
    class Meta:
        db_table = 'notification_preferences'
    
    def __str__(self):
        return f"Préférences de {self.user.get_full_name()}"


class NotificationQueue(BaseModel):
    """File d'attente pour notifications différées"""
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('sent', 'Envoyée'),
        ('failed', 'Échec'),
    ]
    
    notification = models.ForeignKey(RealtimeNotification, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    scheduled_for = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    
    class Meta:
        db_table = 'notification_queue'
        ordering = ['scheduled_for']
    
    def __str__(self):
        return f"{self.notification.title} - {self.status}"
