"""
Assistant IA (Claude) pour étudiants et enseignants — agent conversationnel avec accès en lecture aux données de l'utilisateur courant via function calling.
"""
from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chatbot'
    verbose_name = 'Assistant IA'
