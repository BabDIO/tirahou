# 🏗️ Architecture TIRAHOU

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture Générale](#architecture-générale)
- [Backend (Django)](#backend-django)
- [Frontend (React)](#frontend-react)
- [Infrastructure](#infrastructure)
- [Flux de Données](#flux-de-données)
- [Sécurité](#sécurité)

---

## 🎯 Vue d'ensemble

TIRAHOU est une plateforme universitaire complète construite avec une architecture moderne **découplée** :

- **Backend** : API REST avec Django REST Framework
- **Frontend** : SPA (Single Page Application) avec React + TypeScript
- **Communication** : JWT pour l'authentification, REST API pour les données
- **Temps réel** : WebSocket/Socket.io (à venir)

### Stack Technologique

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  React 19 + TypeScript + Vite + TailwindCSS             │
│  TanStack Query + Zustand + React Router                │
└─────────────────────────────────────────────────────────┘
                          ▼ HTTPS / REST API
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Django)                       │
│  Django 5.2 + DRF + JWT + PostgreSQL                    │
│  Celery + Redis + WebSocket (Socket.io)                 │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                        │
│  PostgreSQL (BDD) + Redis (Cache/Queue)                 │
│  Storage S3 (Fichiers) + CDN (Assets statiques)         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏛️ Architecture Générale

### Diagramme de haut niveau

```
┌──────────────┐
│   Browser    │
│  (Utilisateur)│
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────────────────────────────────────┐
│            FRONTEND (React SPA)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │   Pages    │  │ Components │  │   Store    │ │
│  └────────────┘  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │    API     │  │   Hooks    │  │   Utils    │ │
│  │  Clients   │  │            │  │            │ │
│  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │ REST API (JSON)
                       │ JWT Token
                       ▼
┌──────────────────────────────────────────────────┐
│              BACKEND (Django)                     │
│  ┌─────────────────────────────────────────────┐ │
│  │         Django REST Framework API           │ │
│  │  Authentication │ Permissions │ Serializers │ │
│  └─────────────────────────────────────────────┘ │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ Apps │  │ Apps │  │ Apps │  │ Apps │  ...  │
│  │  19x │  │      │  │      │  │      │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
│  ┌─────────────────────────────────────────────┐ │
│  │            Business Logic Layer             │ │
│  │   Models │ Services │ Tasks │ Signals       │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│  PostgreSQL  │ │  Redis   │ │ Storage  │
│   Database   │ │  Cache   │ │   (S3)   │
└──────────────┘ └──────────┘ └──────────┘
                       ▲
                       │ Queue
                       ▼
                ┌──────────┐
                │  Celery  │
                │  Workers │
                └──────────┘
```

---

## 🔧 Backend (Django)

### Structure des Apps

```
backend/
├── config/                    # Configuration Django
│   ├── settings.py           # Paramètres
│   ├── urls.py               # URLs principales
│   ├── celery.py             # Configuration Celery
│   └── wsgi.py / asgi.py     # Serveurs
│
└── apps/                      # Applications Django (19 modules)
    ├── accounts/             # Authentification, utilisateurs
    ├── people/               # Étudiants, enseignants, personnel
    ├── academic/             # Structure académique
    ├── programs/             # Programmes LMD
    ├── admissions/           # Candidatures
    ├── enrollment/           # Inscriptions
    ├── evaluation/           # Notes, délibérations
    ├── finance/              # Facturation, paiements
    ├── documents/            # GED, génération PDF
    ├── lms/                  # LMS, cours en ligne
    ├── virtual_class/        # Classes virtuelles
    ├── attendance/           # Présences
    ├── scheduling_app/       # Emplois du temps
    ├── internships/          # Stages, mémoires
    ├── communication/        # Notifications, messages
    ├── analytics_app/        # Analytics, statistiques
    ├── library/              # Bibliothèque
    ├── api/                  # Endpoints API centralisés
    └── core/                 # Modèles de base, mixins
```

### Architecture d'une App Django

Chaque app suit le pattern **MVT (Model-View-Template)** adapté pour l'API :

```
apps/evaluation/
├── __init__.py
├── models.py              # Modèles de données (ORM)
├── serializers.py         # Sérialisation JSON (DRF)
├── views.py               # ViewSets API (DRF)
├── urls.py                # Routes de l'app
├── permissions.py         # Permissions personnalisées
├── filters.py             # Filtres de recherche
├── services.py            # Logique métier
├── tasks.py               # Tâches Celery asynchrones
├── signals.py             # Signaux Django
├── admin.py               # Interface d'administration
├── tests/                 # Tests unitaires
│   ├── test_models.py
│   ├── test_views.py
│   └── test_serializers.py
└── migrations/            # Migrations de BDD
```

### Couches d'Abstraction

```
┌─────────────────────────────────────────┐
│          API Layer (urls.py)            │  ← Endpoints REST
├─────────────────────────────────────────┤
│     ViewSets (views.py)                 │  ← Logique de requête/réponse
├─────────────────────────────────────────┤
│   Serializers (serializers.py)          │  ← Validation, transformation JSON
├─────────────────────────────────────────┤
│   Services (services.py)                │  ← Logique métier complexe
├─────────────────────────────────────────┤
│   Models (models.py)                    │  ← Couche de données (ORM)
├─────────────────────────────────────────┤
│   Database (PostgreSQL)                 │  ← Stockage persistant
└─────────────────────────────────────────┘
```

### Authentification & Permissions

```python
# JWT Authentication Flow
1. User login → POST /api/v1/auth/login/
2. Backend vérifie credentials
3. Backend génère access_token + refresh_token
4. Frontend stocke tokens
5. Frontend envoie token dans header: Authorization: Bearer <token>
6. Backend valide token pour chaque requête
7. Token expire → Frontend utilise refresh_token
8. Logout → Backend blacklist token
```

**Permissions RBAC** :
- 13 rôles définis
- Permissions granulaires par endpoint
- Vérification via `IsAdminUser`, `IsTeacher`, etc.

---

## 🎨 Frontend (React)

### Structure du Projet

```
frontend/
├── public/               # Assets statiques
├── src/
│   ├── api/             # Clients API (axios)
│   ├── components/      # Composants réutilisables
│   │   ├── ui/         # Composants UI de base
│   │   ├── forms/      # Formulaires
│   │   ├── layout/     # Layout (Header, Sidebar)
│   │   └── ...
│   ├── contexts/        # Contexts React (Theme, Auth)
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilitaires, helpers
│   │   ├── constants.ts
│   │   ├── statusHelpers.ts
│   │   └── utils.ts
│   ├── pages/           # Pages de l'application (60+)
│   │   ├── auth/
│   │   ├── student/
│   │   ├── teacher/
│   │   ├── admin/
│   │   └── ...
│   ├── store/           # State management (Zustand)
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Composant racine
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
└── package.json
```

### Architecture des Composants

```
App.tsx
  ├── ThemeProvider (Context)
  ├── QueryClientProvider (TanStack Query)
  ├── BrowserRouter (React Router)
  │   └── Routes
  │       ├── Public Routes
  │       │   ├── LandingPage
  │       │   ├── LoginPage
  │       │   └── ...
  │       └── Protected Routes (ProtectedRoute HOC)
  │           └── MainLayout
  │               ├── Header
  │               ├── Sidebar
  │               └── Content (Pages)
  │                   ├── DashboardPage
  │                   ├── MyCoursesPage
  │                   └── ...
  └── GlobalComponents
      ├── Toaster (Notifications)
      └── ConfirmDialog (Modals)
```

### Gestion d'État

```
┌──────────────────────────────────────────┐
│         TanStack Query (Server State)     │  ← Cache API, requêtes
├──────────────────────────────────────────┤
│         Zustand (Client State)            │  ← État global (auth, UI)
├──────────────────────────────────────────┤
│         React Context (Theme, etc.)       │  ← Contextes partagés
├──────────────────────────────────────────┤
│         Local State (useState)            │  ← État local des composants
└──────────────────────────────────────────┘
```

### Flux de Données

```
Component
   │
   │ useQuery / useMutation
   ▼
TanStack Query
   │
   │ axios request
   ▼
API Client (axios)
   │
   │ HTTP Request + JWT
   ▼
Backend API
   │
   │ JSON Response
   ▼
TanStack Query Cache
   │
   │ auto update
   ▼
Component Re-render
```

---

## 🚀 Infrastructure

### Environnement de Développement

```
localhost:5173         → Frontend (Vite dev server)
localhost:8000         → Backend (Django dev server)
localhost:6379         → Redis (Cache + Queue)
localhost:5555         → Flower (Celery monitoring)
localhost:5432         → PostgreSQL
```

### Environnement de Production

```
┌─────────────┐
│   Vercel    │  → Frontend (React build)
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│   Render    │  → Backend (Django + Gunicorn)
│   (ou AWS)  │
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌──────┐ ┌──────┐
│ RDS  │ │ElastiCache│  → PostgreSQL + Redis managed
└──────┘ └──────┘
```

### Services Externes

- **Storage** : AWS S3 ou compatible (fichiers, uploads)
- **CDN** : CloudFlare (assets statiques)
- **Email** : SendGrid, Mailgun ou SMTP
- **Monitoring** : Sentry (erreurs)
- **Analytics** : Google Analytics, Plausible

---

## 🔄 Flux de Données

### Authentification

```
1. User entre email + password
   ↓
2. Frontend → POST /api/v1/auth/login/
   ↓
3. Backend vérifie credentials
   ↓
4. Backend génère access_token (5min) + refresh_token (7j)
   ↓
5. Frontend stocke dans localStorage
   ↓
6. Frontend configure axios avec interceptor
   ↓
7. Toutes les requêtes incluent: Authorization: Bearer <token>
   ↓
8. Si token expiré → Auto-refresh avec refresh_token
```

### CRUD Opérations

```
CREATE:
  User clicks "Créer" → Modal → Form → Submit
    ↓
  useMutation → POST /api/v1/resource/
    ↓
  Backend valide → Crée en BDD → Retourne JSON
    ↓
  TanStack Query invalide cache → Refetch liste
    ↓
  UI se met à jour automatiquement

READ:
  Component mounts → useQuery → GET /api/v1/resource/
    ↓
  TanStack Query check cache
    ↓
  Si pas en cache → Fetch backend
    ↓
  Cache la réponse (5 min staleTime)
    ↓
  Component affiche les données

UPDATE:
  User modifie → Submit
    ↓
  useMutation → PATCH /api/v1/resource/{id}/
    ↓
  Backend update → Retourne JSON
    ↓
  TanStack Query met à jour cache
    ↓
  UI reflète le changement

DELETE:
  User clicks "Supprimer" → Confirm
    ↓
  useMutation → DELETE /api/v1/resource/{id}/
    ↓
  Backend supprime
    ↓
  TanStack Query invalide cache
    ↓
  Item disparaît de l'UI
```

### Tâches Asynchrones (Celery)

```
Backend déclenche tâche
   ↓
Celery task queued in Redis
   ↓
Celery Worker execute la tâche
   ↓
Résultat stocké dans Redis
   ↓
(Optionnel) Notification à l'utilisateur
```

**Exemples** :
- Envoi d'emails en masse
- Génération de PDF lourds
- Calcul de statistiques
- Rappels automatiques
- Archivage de données

---

## 🔐 Sécurité

### Authentification

- **JWT** : Access token (5 min) + Refresh token (7 jours)
- **Token Blacklist** : Tokens révoqués lors du logout
- **HTTPS** : Obligatoire en production
- **CORS** : Configuré pour frontend uniquement

### Permissions

```python
# Hiérarchie des permissions
Super Admin > Admin Institutionnel > Responsables > Staff > Étudiants

# Vérification à chaque endpoint
@action(detail=True, methods=['post'])
@permission_classes([IsAdminUser])
def validate_grades(self, request, pk=None):
    # Seuls les admins peuvent valider
    ...
```

### Protection des Données

- **Validation** : Côté client (React Hook Form) + Serveur (DRF Serializers)
- **Sanitization** : Protection XSS automatique (React)
- **SQL Injection** : Protection ORM Django
- **CSRF** : Token CSRF pour les requêtes sensibles
- **Rate Limiting** : Throttling DRF (5 req/min login, 100 req/min autres)

### Audit Trail

```python
# Toutes les actions critiques sont loggées
apps.api.models.AuditLog
  - user
  - action (create, update, delete)
  - resource
  - timestamp
  - ip_address
  - changes (JSON)
```

---

## 📊 Scalabilité

### Horizontal Scaling

```
┌─────────────┐
│ Load        │
│ Balancer    │
└──────┬──────┘
       │
   ┌───┴─────┬─────────┐
   ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐
│Django│ │Django│ │Django│  → Multiple instances
│ App  │ │ App  │ │ App  │
└──────┘ └──────┘ └──────┘
       │         │         │
       └────┬────┴────┬────┘
            ▼         ▼
       ┌──────┐ ┌──────┐
       │ RDS  │ │Redis │  → Shared resources
       └──────┘ └──────┘
```

### Caching Strategy

```
1. Browser Cache (assets statiques) → 1 an
2. CDN Cache (images, JS, CSS) → 1 mois
3. Redis Cache (données fréquentes) → 5-60 min
4. TanStack Query Cache (frontend) → 5 min
5. Database (source de vérité)
```

---

## 🔧 Outils de Développement

### Backend
- **Django Debug Toolbar** : Profiling, SQL queries
- **django-extensions** : Shell plus, graph_models
- **pytest-django** : Tests modernes
- **Flower** : Monitoring Celery

### Frontend
- **React DevTools** : Inspection composants
- **TanStack Query DevTools** : Cache inspection
- **Vite HMR** : Hot Module Replacement ultra-rapide
- **TypeScript** : Vérification de types

---

**Dernière mise à jour** : Juillet 2026  
**Version** : 1.3.0

---

<div align="center">

[⬆ Retour à la documentation](../README.md)

</div>
