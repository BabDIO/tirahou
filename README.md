# TIRAHOU — Plateforme Intégrée de Gestion Universitaire

[![Backend](https://img.shields.io/badge/Backend-Django%205.2-092E20?logo=django)](https://djangoproject.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev)
[![API](https://img.shields.io/badge/API-REST%20%2B%20JWT-orange)](https://www.django-rest-framework.org)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

ERP universitaire fullstack couvrant l'intégralité du cycle de vie étudiant :
candidature → admission → inscription → LMS → évaluation → délibération → diplomation.

---

## 🗂 Structure du projet

```
tirahou/
├── backend/          # Django 5.2 + DRF — API REST
└── frontend/         # React 19 + TypeScript + Vite — SPA/PWA
```

---

## ⚡ Lancement rapide (développement)

### Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # éditer les variables
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API disponible sur : http://localhost:8000/api/v1/
Swagger UI : http://localhost:8000/api/docs/

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # éditer VITE_API_URL
npm run dev
```

Application disponible sur : http://localhost:3000/

---

## 🌐 Déploiement en production

### Backend → Render.com

1. Créer un compte sur [render.com](https://render.com)
2. **New → Web Service** → connecter ce dépôt GitHub
3. Paramètres :
   - **Root Directory** : `backend`
   - **Build Command** : `./build.sh`
   - **Start Command** : `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
4. Variables d'environnement à configurer :

| Variable | Valeur |
|----------|--------|
| `DJANGO_SETTINGS_MODULE` | `config.settings_production` |
| `SECRET_KEY` | (générer avec `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `DATABASE_URL` | (fourni automatiquement par Render PostgreSQL) |
| `ALLOWED_HOSTS` | `tirahou-backend.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://tirahou.vercel.app` |
| `DEBUG` | `False` |

5. **New → PostgreSQL** → noter l'URL de connexion → l'ajouter comme `DATABASE_URL`

### Frontend → Vercel

1. Créer un compte sur [vercel.com](https://vercel.com)
2. **New Project** → importer ce dépôt GitHub
3. Paramètres :
   - **Root Directory** : `frontend`
   - **Framework** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Variable d'environnement :
   - `VITE_API_URL` = `https://tirahou-backend.onrender.com/api/v1`

---

## 🏗 Architecture technique

```
┌─────────────────────────────┐     HTTPS/JWT      ┌──────────────────────────┐
│  Frontend React 19 (Vercel) │ ◄─────────────────► │  Backend Django (Render) │
│  TypeScript + Vite + PWA    │                     │  DRF + PostgreSQL + Redis│
└─────────────────────────────┘                     └──────────────────────────┘
```

### Modules backend (19 apps Django)

| App | Domaine |
|-----|---------|
| `accounts` | Auth JWT, RBAC 13 rôles, Audit |
| `academic` | Structure universitaire, Années, LMD |
| `programs` | Programmes, Semestres, UE, EC |
| `people` | Étudiants, Enseignants, Personnel |
| `admissions` | Candidatures, Documents, Décisions |
| `enrollment` | Inscriptions admin + péda + UE |
| `finance` | Factures, Paiements, Bourses |
| `documents` | GED, QR code, PDF |
| `evaluation` | Notes, Résultats, Jury |
| `lms` | Cours, Quiz, Devoirs, Progression |
| `virtual_class` | Classes virtuelles hybrides |
| `attendance` | Présences QR code |
| `scheduling_app` | Emploi du temps, Salles |
| `internships` | Stages, Mémoires, Soutenances |
| `communication` | Notifications, Messagerie, Forums |
| `analytics_app` | Engagement, Prédiction décrochage |
| `library` | Bibliothèque numérique + physique |

### Rôles utilisateurs (13)

`super_admin` · `admin_institutionnel` · `admin_scolarite` · `admin_financier` · `responsable_pedagogique` · `chef_departement` · `enseignant` · `tuteur` · `etudiant` · `doctorant` · `bibliothecaire` · `invite` · `support_technique`

---

## 📋 Variables d'environnement

### Backend (`.env`)

```env
SECRET_KEY=your-secret-key-min-50-chars
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=django.db.backends.postgresql
DB_NAME=tirahou_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000
JWT_ACCESS_TOKEN_LIFETIME_HOURS=8
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🔑 Comptes de démonstration

Après `python manage.py createsuperuser`, connectez-vous sur `/admin` Django pour créer des utilisateurs avec les rôles souhaités.

---

## 📄 License

MIT — Projet académique TIRAHOU 2024-2025
