# 🚀 Guide Celery - TIRAHOU

## 📋 Table des Matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Tâches Disponibles](#tâches-disponibles)
- [Monitoring](#monitoring)
- [Production](#production)

---

## 🔧 Installation

### 1. Installer Redis

**Windows:**
```bash
# Via Chocolatey
choco install redis-64

# Ou télécharger depuis https://github.com/microsoftarchive/redis/releases
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac avec Homebrew
brew install redis
```

### 2. Installer les dépendances Python

```bash
cd backend
pip install -r requirements_celery.txt
```

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Vérifier la configuration

```python
python manage.py shell

>>> from django.conf import settings
>>> print(settings.CELERY_BROKER_URL)
redis://localhost:6379/0
```

---

## 🚀 Démarrage

### 1. Démarrer Redis

```bash
# Windows
redis-server

# Linux/Mac
redis-server
# Ou en service
sudo systemctl start redis
```

### 2. Démarrer Celery Worker

```bash
cd backend

# Windows
celery -A config worker -l info --pool=solo

# Linux/Mac
celery -A config worker -l info
```

### 3. Démarrer Celery Beat (Tâches planifiées)

Dans un nouveau terminal :

```bash
cd backend

# Windows
celery -A config beat -l info

# Linux/Mac
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### 4. (Optionnel) Démarrer Flower (Monitoring)

Dans un nouveau terminal :

```bash
cd backend
celery -A config flower
```

Accéder à : http://localhost:5555

---

## 📝 Tâches Disponibles

### Finance (`apps.finance.tasks`)

| Tâche | Description | Planification |
|-------|-------------|---------------|
| `send_payment_reminders` | Envoie des rappels de paiement | Quotidien à 9h |
| `calculate_monthly_revenue` | Calcule le revenu mensuel | Manuel |
| `auto_apply_late_fees` | Applique les pénalités de retard | Hebdomadaire |

**Exécution manuelle :**
```python
from apps.finance.tasks import send_payment_reminders
result = send_payment_reminders.delay()
print(result.get())
```

### Classes Virtuelles (`apps.virtual_class.tasks`)

| Tâche | Description | Planification |
|-------|-------------|---------------|
| `check_upcoming_sessions` | Vérifie les sessions à venir | Toutes les 5 min |
| `auto_end_stale_sessions` | Termine les sessions inactives | Toutes les heures |
| `cleanup_old_session_recordings` | Archive les vieux enregistrements | Mensuel |
| `send_session_summary_email` | Envoie un récapitulatif de session | Après chaque session |

**Exécution manuelle :**
```python
from apps.virtual_class.tasks import check_upcoming_sessions
result = check_upcoming_sessions.delay()
```

### Analytics (`apps.analytics_app.tasks`)

| Tâche | Description | Planification |
|-------|-------------|---------------|
| `calculate_daily_stats` | Calcule les statistiques quotidiennes | Quotidien à 1h |
| `detect_at_risk_students` | Détecte les étudiants à risque | Hebdomadaire |
| `generate_weekly_report` | Génère un rapport hebdomadaire | Dimanche à 23h |
| `cleanup_old_analytics` | Nettoie les anciennes données | Mensuel |

### Comptes (`apps.accounts.tasks`)

| Tâche | Description | Planification |
|-------|-------------|---------------|
| `cleanup_expired_tokens` | Nettoie les tokens expirés | Quotidien à 2h |
| `send_password_expiry_reminders` | Rappels d'expiration de mot de passe | Hebdomadaire |
| `deactivate_inactive_users` | Désactive les utilisateurs inactifs | Mensuel |

### Communication (`apps.communication.tasks`)

| Tâche | Description | Planification |
|-------|-------------|---------------|
| `archive_old_notifications` | Archive les notifications anciennes | Dimanche à 3h |
| `send_daily_digest` | Envoie un résumé quotidien | Quotidien à 8h |
| `cleanup_expired_announcements` | Nettoie les annonces expirées | Quotidien |

---

## 📊 Monitoring

### 1. Via Flower (Recommandé)

```bash
celery -A config flower
```

Interface web : http://localhost:5555

Features :
- Vue en temps réel des workers
- Historique des tâches
- Statistiques de performance
- Monitoring des files d'attente

### 2. Via CLI

**Voir les workers actifs :**
```bash
celery -A config inspect active
```

**Voir les tâches planifiées :**
```bash
celery -A config inspect scheduled
```

**Voir les statistiques :**
```bash
celery -A config inspect stats
```

**Révoquer une tâche :**
```bash
celery -A config control revoke <task_id>
```

### 3. Via Django Admin

Installer django-celery-beat pour gérer les tâches périodiques depuis l'admin :

```python
# settings.py
INSTALLED_APPS = [
    ...
    'django_celery_beat',
    'django_celery_results',
]
```

```bash
python manage.py migrate django_celery_beat
```

Accéder à : http://localhost:8000/admin/django_celery_beat/

---

## 🌐 Déploiement en Production

### 1. Utiliser Supervisor (Linux)

**Installer Supervisor :**
```bash
sudo apt-get install supervisor
```

**Créer `/etc/supervisor/conf.d/celery.conf` :**
```ini
[program:celery]
command=/path/to/venv/bin/celery -A config worker -l info
directory=/path/to/backend
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker_err.log
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
stopasgroup=true
priority=998

[program:celerybeat]
command=/path/to/venv/bin/celery -A config beat -l info
directory=/path/to/backend
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/beat.log
stderr_logfile=/var/log/celery/beat_err.log
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
priority=999
```

**Démarrer :**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start celery
sudo supervisorctl start celerybeat
```

### 2. Utiliser systemd (Linux)

**Créer `/etc/systemd/system/celery.service` :**
```ini
[Unit]
Description=Celery Service
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/celery -A config worker -l info --detach
ExecStop=/path/to/venv/bin/celery multi stopwait celery
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Démarrer :**
```bash
sudo systemctl daemon-reload
sudo systemctl enable celery
sudo systemctl start celery
sudo systemctl status celery
```

### 3. Docker Compose

**Ajouter à `docker-compose.yml` :**
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  celery:
    build: ./backend
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - db
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
  
  celery-beat:
    build: ./backend
    command: celery -A config beat -l info
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - db
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
  
  flower:
    build: ./backend
    command: celery -A config flower
    ports:
      - "5555:5555"
    depends_on:
      - redis
      - celery
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
```

---

## 🧪 Tests

### Tester une tâche manuellement

```python
python manage.py shell

>>> from apps.finance.tasks import send_payment_reminders
>>> result = send_payment_reminders.delay()
>>> print(result.get(timeout=10))
```

### Tester le broker Redis

```python
>>> from celery import current_app
>>> current_app.connection().connect()
# Si pas d'erreur, Redis est accessible
```

### Voir les tâches enregistrées

```python
>>> from celery import current_app
>>> print(current_app.tasks.keys())
```

---

## 🔧 Dépannage

### Redis non accessible

**Erreur :** `Cannot connect to redis://localhost:6379/0`

**Solution :**
```bash
# Vérifier si Redis tourne
redis-cli ping
# Doit retourner PONG

# Sinon, démarrer Redis
redis-server
```

### Worker ne démarre pas sur Windows

**Erreur :** `ValueError: not enough values to unpack`

**Solution :**
```bash
# Utiliser --pool=solo sur Windows
celery -A config worker -l info --pool=solo
```

### Tâches ne s'exécutent pas

**Vérifier :**
1. Worker est démarré
2. Beat est démarré (pour tâches périodiques)
3. Redis est accessible
4. Pas d'erreurs dans les logs

```bash
# Voir les logs worker
celery -A config worker -l debug

# Voir les logs beat
celery -A config beat -l debug
```

---

## 📚 Ressources

- [Documentation Celery](https://docs.celeryproject.org/)
- [Django-Celery-Beat](https://django-celery-beat.readthedocs.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Flower Documentation](https://flower.readthedocs.io/)

---

**Dernière mise à jour** : Juillet 2026  
**Version** : 1.3.0
