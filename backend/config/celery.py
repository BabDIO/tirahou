"""
Configuration Celery pour TIRAHOU
"""
import os
from celery import Celery
from celery.schedules import crontab

# config/__init__.py importe ce module sans condition, donc ce setdefault
# s'exécute avant celui de n'importe quel autre entrypoint qui importe le
# paquet "config" en premier (notamment config.wsgi, utilisé par gunicorn en
# production) -- il doit donc pointer vers des settings sûrs (DEBUG=False)
# par défaut. manage.py n'est pas affecté : son propre setdefault('config.settings')
# s'exécute avant que le paquet config ne soit importé.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_production')

app = Celery('tirahou')

# Load config from Django settings with CELERY namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Configuration des tâches périodiques
app.conf.beat_schedule = {
    # Vérifier les classes virtuelles à démarrer
    'check-upcoming-virtual-classes': {
        'task': 'apps.virtual_class.tasks.check_upcoming_sessions',
        'schedule': crontab(minute='*/5'),  # Toutes les 5 minutes
    },
    # Envoyer les rappels de paiement
    'send-payment-reminders': {
        'task': 'apps.finance.tasks.send_payment_reminders',
        'schedule': crontab(hour=9, minute=0),  # Chaque jour à 9h
    },
    # Envoyer les rappels d'examens (3 jours avant le début de session)
    'send-exam-reminders': {
        'task': 'apps.evaluation.tasks.send_exam_reminders',
        'schedule': crontab(hour=8, minute=0),  # Chaque jour à 8h
    },
    # Calculer les statistiques quotidiennes
    'calculate-daily-statistics': {
        'task': 'apps.analytics_app.tasks.calculate_daily_stats',
        'schedule': crontab(hour=1, minute=0),  # Chaque jour à 1h du matin
    },
    # Nettoyer les anciennes sessions
    'cleanup-expired-sessions': {
        'task': 'apps.accounts.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=2, minute=0),  # Chaque jour à 2h du matin
    },
    # Archiver les anciennes notifications
    'archive-old-notifications': {
        'task': 'apps.communication.tasks.archive_old_notifications',
        'schedule': crontab(hour=3, minute=0, day_of_week='sunday'),  # Chaque dimanche à 3h
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Tâche de débogage"""
    print(f'Request: {self.request!r}')
