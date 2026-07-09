# 🚀 Guide de Déploiement - TIRAHOU

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Prérequis](#prérequis)
- [Déploiement Backend](#déploiement-backend)
- [Déploiement Frontend](#déploiement-frontend)
- [Configuration Production](#configuration-production)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)

---

## 🎯 Vue d'ensemble

Ce guide couvre le déploiement de TIRAHOU en production avec :
- **Backend** : Django sur Render/AWS/Heroku
- **Frontend** : React sur Vercel/Netlify
- **Database** : PostgreSQL (RDS ou managed)
- **Cache** : Redis (ElastiCache ou managed)
- **Storage** : AWS S3

---

## ✅ Prérequis

### Comptes nécessaires

- [ ] Compte GitHub (pour le code)
- [ ] Compte Render ou AWS (backend)
- [ ] Compte Vercel ou Netlify (frontend)
- [ ] Compte AWS (S3 storage)
- [ ] Domaine personnalisé (optionnel)

### Outils locaux

```bash
# Installer les outils
pip install gunicorn psycopg2-binary
npm install -g vercel
```

---

## 🔧 Déploiement Backend

### Option 1 : Render (Recommandé pour débuter)

#### 1. Préparation

**Créer `backend/render.yaml` :**

```yaml
services:
  - type: web
    name: tirahou-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "gunicorn config.wsgi:application"
    envVars:
      - key: PYTHON_VERSION
        value: 3.10.0
      - key: DATABASE_URL
        fromDatabase:
          name: tirahou-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: ALLOWED_HOSTS
        value: .onrender.com
      - key: REDIS_URL
        value: redis://red-xxxxx:6379
      
databases:
  - name: tirahou-db
    plan: starter
    databaseName: tirahou
    user: tirahou_user
```

**Créer `backend/build.sh` :**

```bash
#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
```

#### 2. Déploiement

```bash
# Via GitHub
1. Push le code sur GitHub
2. Se connecter à render.com
3. New → Web Service
4. Connecter le repo GitHub
5. Sélectionner backend/
6. Render détecte automatiquement render.yaml
7. Deploy!

# Via CLI
render deploy
```

#### 3. Configuration environnement

Dans le dashboard Render, ajouter les variables :

```
SECRET_KEY=<généré automatiquement>
DEBUG=False
ALLOWED_HOSTS=tirahou-backend.onrender.com,.vercel.app
DATABASE_URL=<auto depuis PostgreSQL service>
REDIS_URL=<depuis Redis service>
AWS_ACCESS_KEY_ID=<votre clé AWS>
AWS_SECRET_ACCESS_KEY=<votre clé secrète>
AWS_STORAGE_BUCKET_NAME=tirahou-media
```

### Option 2 : AWS EC2 + RDS

#### 1. Lancer une instance EC2

```bash
# Se connecter à l'instance
ssh -i key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Installer les dépendances
sudo apt update
sudo apt install python3-pip python3-venv nginx postgresql-client redis-server
```

#### 2. Setup du projet

```bash
# Cloner le repo
git clone https://github.com/BabDIO/tirahou.git
cd tirahou/backend

# Environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# Variables d'environnement
cp .env.example .env
nano .env  # Éditer avec les bonnes valeurs
```

#### 3. Configuration PostgreSQL (RDS)

```bash
# Créer la base de données sur RDS via console AWS
# Puis migrer
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic
```

#### 4. Configuration Gunicorn

**Créer `/etc/systemd/system/gunicorn.service` :**

```ini
[Unit]
Description=gunicorn daemon for TIRAHOU
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/tirahou/backend
ExecStart=/home/ubuntu/tirahou/backend/venv/bin/gunicorn \
          --workers 3 \
          --bind unix:/run/gunicorn.sock \
          config.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
```

#### 5. Configuration Nginx

**Créer `/etc/nginx/sites-available/tirahou` :**

```nginx
server {
    listen 80;
    server_name api.tirahou.edu;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        alias /home/ubuntu/tirahou/backend/staticfiles/;
    }

    location /media/ {
        alias /home/ubuntu/tirahou/backend/media/;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tirahou /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.tirahou.edu
```

### Celery en Production

**Créer `/etc/supervisor/conf.d/celery.conf` :**

```ini
[program:celery]
command=/home/ubuntu/tirahou/backend/venv/bin/celery -A config worker -l info
directory=/home/ubuntu/tirahou/backend
user=ubuntu
numprocs=1
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker_err.log
autostart=true
autorestart=true
startsecs=10

[program:celerybeat]
command=/home/ubuntu/tirahou/backend/venv/bin/celery -A config beat -l info
directory=/home/ubuntu/tirahou/backend
user=ubuntu
numprocs=1
stdout_logfile=/var/log/celery/beat.log
stderr_logfile=/var/log/celery/beat_err.log
autostart=true
autorestart=true
startsecs=10
```

```bash
sudo mkdir /var/log/celery
sudo chown ubuntu:ubuntu /var/log/celery
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start celery celerybeat
```

---

## 🎨 Déploiement Frontend

### Option 1 : Vercel (Recommandé)

#### 1. Configuration

**Vérifier `frontend/vercel.json` :**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_API_URL": "https://tirahou-backend.onrender.com/api/v1"
  }
}
```

#### 2. Déploiement

**Via CLI :**

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

**Via GitHub :**

```bash
1. Push le code sur GitHub
2. Se connecter à vercel.com
3. New Project → Import Git Repository
4. Sélectionner le repo
5. Root Directory: frontend/
6. Framework: Vite
7. Environment Variables:
   VITE_API_URL=https://tirahou-backend.onrender.com/api/v1
8. Deploy!
```

### Option 2 : Netlify

```bash
cd frontend

# Créer netlify.toml
cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

# Déployer
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Option 3 : AWS S3 + CloudFront

```bash
cd frontend

# Build
npm run build

# Upload vers S3
aws s3 sync dist/ s3://tirahou-frontend --delete

# Invalider le cache CloudFront
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

---

## ⚙️ Configuration Production

### Variables d'Environnement Backend

```bash
# Django
SECRET_KEY=<généré avec django secret key generator>
DEBUG=False
ALLOWED_HOSTS=api.tirahou.edu,.onrender.com
CORS_ALLOWED_ORIGINS=https://tirahou.edu,https://www.tirahou.edu

# Database
DATABASE_URL=postgresql://user:pass@host:5432/tirahou

# Redis
REDIS_URL=redis://host:6379/0

# Storage
USE_S3=True
AWS_ACCESS_KEY_ID=<votre clé>
AWS_SECRET_ACCESS_KEY=<votre clé secrète>
AWS_STORAGE_BUCKET_NAME=tirahou-media
AWS_S3_REGION_NAME=eu-west-1

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@tirahou.edu
EMAIL_HOST_PASSWORD=<mot de passe app>
DEFAULT_FROM_EMAIL=TIRAHOU <noreply@tirahou.edu>

# Sentry (monitoring)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Variables d'Environnement Frontend

```bash
VITE_API_URL=https://api.tirahou.edu/api/v1
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Checklist de Sécurité

- [ ] `DEBUG=False` en production
- [ ] `ALLOWED_HOSTS` configuré correctement
- [ ] `SECRET_KEY` unique et sécurisé
- [ ] HTTPS activé (Let's Encrypt)
- [ ] CORS configuré pour le frontend uniquement
- [ ] Rate limiting activé
- [ ] Sentry configuré pour les erreurs
- [ ] Backups automatiques de la BDD
- [ ] Variables sensibles dans .env (jamais dans git)

---

## 📊 Monitoring

### Sentry (Erreurs)

**Backend :**

```bash
pip install sentry-sdk
```

```python
# config/settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

if not DEBUG:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True
    )
```

**Frontend :**

```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 1.0,
  });
}
```

### Logs

**Backend - CloudWatch / Papertrail :**

```python
# config/settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/tirahou/django.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Uptime Monitoring

- **UptimeRobot** : https://uptimerobot.com/
- **Pingdom** : https://www.pingdom.com/
- **StatusPage** : https://www.statuspage.io/

---

## 🔄 Maintenance

### Backups

**PostgreSQL automatique :**

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /backups/tirahou_$DATE.sql
aws s3 cp /backups/tirahou_$DATE.sql s3://tirahou-backups/

# Garder seulement les 30 derniers jours
find /backups -name "tirahou_*.sql" -mtime +30 -delete
```

**Cron job :**

```bash
0 2 * * * /home/ubuntu/backup.sh
```

### Mises à jour

```bash
# Backend
cd /home/ubuntu/tirahou/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn
sudo systemctl restart celery celerybeat

# Frontend
cd /home/ubuntu/tirahou/frontend
git pull origin main
npm install
npm run build
# Upload vers S3 ou redéployer sur Vercel
```

### Rollback

```bash
# Backend
cd /home/ubuntu/tirahou/backend
git log --oneline  # Trouver le commit précédent
git checkout <commit-hash>
python manage.py migrate
sudo systemctl restart gunicorn

# Frontend
vercel rollback  # Ou via dashboard
```

---

## 📝 Checklist de Déploiement

### Avant le Déploiement

- [ ] Tests passent localement
- [ ] Build frontend réussit
- [ ] Migrations Django créées
- [ ] Static files collectés
- [ ] Variables d'environnement documentées
- [ ] Secrets générés (SECRET_KEY, etc.)

### Pendant le Déploiement

- [ ] Créer backup de la BDD
- [ ] Mettre un message de maintenance (optionnel)
- [ ] Déployer backend
- [ ] Exécuter migrations
- [ ] Déployer frontend
- [ ] Vérifier les endpoints critiques

### Après le Déploiement

- [ ] Tester l'authentification
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier les logs (pas d'erreurs)
- [ ] Vérifier Celery tasks
- [ ] Tester le cache Redis
- [ ] Configurer monitoring
- [ ] Retirer le message de maintenance

---

## 🆘 Dépannage

### Backend 500 Error

```bash
# Voir les logs
tail -f /var/log/nginx/error.log
tail -f /var/log/celery/worker.log
journalctl -u gunicorn -f
```

### Frontend ne charge pas

```bash
# Vérifier le build
npm run build

# Vérifier les variables d'env
echo $VITE_API_URL

# Vérifier la console navigateur
# F12 → Console → Erreurs ?
```

### Database Connection Failed

```bash
# Tester la connexion
psql $DATABASE_URL

# Vérifier les permissions
# Vérifier le firewall/security groups
```

---

**Dernière mise à jour** : Juillet 2026  
**Version** : 1.3.0

---

<div align="center">

[⬆ Retour à la documentation](../README.md)

</div>
