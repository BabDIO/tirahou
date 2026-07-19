from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User


class ChatConversation(BaseModel):
    """
    Un fil de discussion avec l'assistant IA, propre à un utilisateur.
    Le titre est dérivé du premier message (voir `views.py`) faute de
    saisie explicite, comme dans la plupart des clients de chat.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_conversations')
    title = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'chatbot_conversations'
        ordering = ['-updated_at']
        verbose_name = 'Conversation IA'
        verbose_name_plural = 'Conversations IA'

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class ChatMessage(BaseModel):
    ROLE_CHOICES = [
        ('user', 'Utilisateur'),
        ('assistant', 'Assistant'),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    # Traçabilité : quels outils (grounding sur données réelles) l'assistant
    # a appelés pour construire sa réponse — utile pour le débogage et pour
    # démontrer au jury que les réponses s'appuient sur l'API métier plutôt
    # que sur des données inventées.
    tools_used = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'chatbot_messages'
        ordering = ['created_at']
        verbose_name = 'Message IA'
        verbose_name_plural = 'Messages IA'

    def __str__(self):
        return f"{self.conversation_id} — {self.role} : {self.content[:50]}"
