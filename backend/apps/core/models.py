import uuid
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class WebhookSubscription(BaseModel):
    """
    Abonnement à un événement métier (8.29 / R2) : permet à un système
    tiers de recevoir un POST HTTP signé (HMAC-SHA256) à chaque
    déclenchement de l'événement souscrit. `is_active` (hérité de
    BaseModel) sert d'interrupteur marche/arrêt.
    """
    EVENT_CHOICES = [
        ('grade.published', 'Note publiée'),
        ('semester_result.published', 'Résultat semestriel publié'),
        ('payment.received', 'Paiement reçu'),
        ('enrollment.validated', 'Inscription validée'),
        ('admission.decided', "Décision d'admission"),
        ('document.generated', 'Document généré'),
    ]

    url = models.URLField()
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    secret = models.CharField(max_length=100, blank=True, help_text="Clé de signature HMAC-SHA256 (en-tête X-Webhook-Signature)")
    description = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'webhook_subscriptions'
        verbose_name = 'Abonnement Webhook'

    def __str__(self):
        return f"{self.get_event_type_display()} → {self.url}"


class WebhookDelivery(BaseModel):
    """Historique des tentatives de livraison — pour diagnostiquer les échecs."""
    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name='deliveries')
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_deliveries'
        ordering = ['-created_at']
        verbose_name = 'Livraison Webhook'

    def __str__(self):
        return f"{self.event_type} → {self.subscription.url} ({'OK' if self.success else 'échec'})"
