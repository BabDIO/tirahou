# 🎓 Plateforme de Gestion Universitaire - Mémoire TIRAHOU

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![Django](https://img.shields.io/badge/django-4.2+-success.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5+-3178C6.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

> Système complet de gestion universitaire avec classes virtuelles, évaluation, LMS et bien plus.

---

## 📋 Table des Matières

- [À Propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Documentation](#-documentation)
- [Captures d'Écran](#-captures-décran)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

---

## 🎯 À Propos

Plateforme complète de gestion universitaire développée dans le cadre d'un mémoire de fin d'études. Cette solution intègre tous les aspects de la vie académique : inscriptions, évaluations, classes virtuelles, gestion documentaire, finance, et bien plus.

### 🌟 Points Forts

- ✅ **Architecture moderne** - Backend Django REST + Frontend React TypeScript
- ✅ **Classes virtuelles intégrées** - Système de visioconférence complet
- ✅ **Gestion multi-rôles** - Étudiants, Enseignants, Scolarité, Admin
- ✅ **Interface intuitive** - Design moderne et responsive
- ✅ **API RESTful** - Documentation Swagger/OpenAPI
- ✅ **Sécurisé** - Authentification JWT, permissions granulaires
- ✅ **Évolutif** - Architecture modulaire et extensible

---

## 🚀 Fonctionnalités

### 👥 Gestion des Acteurs
- Étudiants, Enseignants, Personnel administratif
- Profils détaillés avec historique académique
- Gestion des permissions par rôle

### 📚 Gestion Académique
- Programmes, Semestres, UE, EC
- Inscription administrative et pédagogique
- Groupes et emplois du temps
- Système LMD complet

### 📝 Évaluation
- **Saisie de notes** par enseignants
- Calcul automatique des moyennes (CC 40% + Examen 60%)
- **Validation** par responsables pédagogiques
- Publication des résultats
- Contestations et réclamations
- Relevés de notes automatisés

### 🎥 Classes Virtuelles
- **Visioconférence intégrée** (BigBlueButton, Jitsi, Zoom, Meet, Teams)
- Planification et gestion des sessions
- **Chat en temps réel**
- Partage d'écran
- Enregistrement des sessions
- Suivi de présence (en ligne/présentiel)
- **Test caméra/micro** avant de rejoindre
- Mode hybride (présentiel + distanciel)

### 💰 Finance
- Facturation et paiements
- Échéanciers personnalisés
- Bourses et exonérations
- Suivi des encaissements
- Rapports financiers

### 📄 Documents
- Génération automatique (certificats, relevés, attestations)
- QR codes de vérification
- Gestion électronique des documents (GED)
- Upload et validation de pièces
- Historique et traçabilité

### 🎓 LMS (Learning Management System)
- Espaces de cours en ligne
- Ressources pédagogiques
- Devoirs et soumissions
- Quiz et évaluations
- Suivi de progression

### 📊 Analytics & Reporting
- Tableaux de bord personnalisés
- Statistiques académiques
- Taux de réussite
- Suivi d'engagement
- Prédictions de performance
- Exports Excel/PDF

### 🔔 Communication
- Notifications en temps réel
- Annonces générales
- Messages privés
- Forums de discussion

### 📖 Bibliothèque
- Catalogue de documents
- Recherche avancée
- Téléchargements
- Statistiques d'utilisation

---

## 🛠️ Technologies

### Backend
- **Python** 3.10+
- **Django** 4.2+
- **Django REST Framework** 3.14+
- **PostgreSQL** 14+
- **Celery** (tâches asynchrones)
- **Redis** (cache & message broker)
- **JWT** (authentification)

### Frontend
- **React** 18+
- **TypeScript** 5+
- **Vite** (build tool)
- **TanStack Query** (data fetching)
- **TailwindCSS** (styling)
- **Zustand** (state management)
- **React Router** 6+ (routing)
- **Lucide React** (icons)

### DevOps
- **Git** (version control)
- **Docker** (containerization)
- **GitHub Actions** (CI/CD)
- **Vercel** (frontend hosting)

---

## 📦 Installation

### Méthode Rapide

```bash
# Cloner le projet
git clone https://github.com/BabDIO/tirahou.git
cd tirahou

# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (nouveau terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Pour une installation détaillée, consultez [QUICK_START.md](QUICK_START.md)

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Guide de démarrage rapide
- **[IMPROVEMENTS.md](frontend/IMPROVEMENTS.md)** - Améliorations v1.2.0
- **[BACKEND_CONFORMITY.md](frontend/BACKEND_CONFORMITY.md)** - Conformité API
- **[CHANGELOG.md](CHANGELOG.md)** - Historique des versions

### API Documentation
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

---

## 📸 Captures d'Écran

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Classes Virtuelles
![Virtual Class](docs/screenshots/virtual-class.png)

### Saisie de Notes
![Grades](docs/screenshots/grades.png)

### Gestion Documentaire
![Documents](docs/screenshots/documents.png)

---

## 🎨 Architecture

```
memoire/
├── backend/                # Django Backend
│   ├── apps/              # Applications Django
│   │   ├── accounts/      # Authentification
│   │   ├── people/        # Étudiants, Enseignants
│   │   ├── academic/      # Structure académique
│   │   ├── programs/      # Programmes et maquettes
│   │   ├── admissions/    # Candidatures
│   │   ├── enrollment/    # Inscriptions
│   │   ├── evaluation/    # Notes et évaluations
│   │   ├── finance/       # Finance et paiements
│   │   ├── documents/     # GED
│   │   ├── lms/           # LMS
│   │   ├── virtual_class/ # Classes virtuelles
│   │   ├── scheduling/    # Emplois du temps
│   │   ├── attendance/    # Présences
│   │   ├── library/       # Bibliothèque
│   │   ├── analytics/     # Analytics
│   │   └── communication/ # Notifications
│   ├── config/            # Configuration Django
│   └── requirements.txt   # Dépendances Python
│
└── frontend/              # React Frontend
    ├── src/
    │   ├── api/           # API clients
    │   ├── components/    # Composants React
    │   ├── pages/         # Pages de l'application
    │   ├── lib/           # Utilitaires
    │   ├── hooks/         # Custom hooks
    │   ├── store/         # State management
    │   └── types/         # TypeScript types
    └── package.json       # Dépendances NPM
```

---

## 🧪 Tests

### Backend
```bash
cd backend
python manage.py test
coverage run manage.py test
coverage report
```

### Frontend
```bash
cd frontend
npm run test
npm run test:coverage
```

---

## 🚢 Déploiement

### Backend (Production)
```bash
cd backend
pip install -r requirements.txt
python manage.py collectstatic
gunicorn config.wsgi:application
```

### Frontend (Production)
```bash
cd frontend
npm run build
# Déployer le dossier dist/
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📈 Roadmap

### v1.3.0 (À venir)
- [ ] Intégration WebRTC complète
- [ ] Socket.io pour temps réel
- [ ] Tableau blanc collaboratif
- [ ] Système de thèmes (clair/sombre)
- [ ] Progressive Web App (PWA)

### v2.0.0 (Future)
- [ ] Application mobile (React Native)
- [ ] Internationalisation (i18n)
- [ ] IA pour prédictions de réussite
- [ ] Blockchain pour certificats
- [ ] Chatbot d'assistance

---

## 👨‍💻 Auteur

**TIRAHOU**
- GitHub: [@BabDIO](https://github.com/BabDIO)
- Email: tirahou@example.com

---

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- Tous les contributeurs
- Les mainteneurs des bibliothèques utilisées
- La communauté open source

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email: support@votre-universite.edu
- 🐛 Issues: [GitHub Issues](https://github.com/BabDIO/tirahou/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/BabDIO/tirahou/discussions)

---

<div align="center">

**⭐ Si ce projet vous a aidé, n'hésitez pas à lui donner une étoile ! ⭐**

Made with ❤️ by TIRAHOU

</div>
