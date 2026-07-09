# 📚 Documentation TIRAHOU

Bienvenue dans la documentation complète de la plateforme TIRAHOU.

## 📖 Table des Matières

### 🚀 Pour Commencer

- **[Guide de Démarrage Rapide](guides/QUICK_START.md)** - Installation et configuration en 5 minutes
- **[README Principal](../README.md)** - Vue d'ensemble du projet

### 🎓 Guides

- **[Guide de Contribution](guides/CONTRIBUTING.md)** - Comment contribuer au projet
  - Standards de code
  - Process de Pull Request
  - Conventions de commit
  - Templates d'issues

### 🔧 Backend

- **[Guide Celery](backend/CELERY_GUIDE.md)** - Configuration et utilisation de Celery
  - Installation Redis
  - Tâches asynchrones
  - Planification (Beat)
  - Monitoring avec Flower
  - Déploiement en production

- **[Guide de Tests](backend/TESTING_GUIDE.md)** - Tests backend complets
  - Tests unitaires et d'intégration
  - Tests d'API (Django REST Framework)
  - Couverture de tests (coverage)
  - Tests de tâches Celery
  - Mocking et fixtures
  - CI/CD avec GitHub Actions

### 🎨 Frontend

- **[Améliorations](frontend/IMPROVEMENTS.md)** - Historique des améliorations frontend
  - Version 1.2.0 : Classes virtuelles, pages de statut
  - Centralisation des constantes
  - Helpers réutilisables
  - Composants Skeleton avancés

- **[Conformité Backend-Frontend](frontend/BACKEND_CONFORMITY.md)** - Analyse de conformité
  - Vérification des endpoints
  - Score de conformité (95%)
  - Recommandations d'amélioration

### 📊 Gestion de Projet

- **[TODO](project/TODO.md)** - Liste des tâches et améliorations futures
  - Priorité Haute (v1.3.0)
  - Priorité Moyenne (v1.4.0)
  - Priorité Basse (v2.0.0)
  - Roadmap détaillée

- **[Changelog](project/CHANGELOG.md)** - Historique des versions
  - Version 1.2.0 - Juillet 2026
  - Nouvelles fonctionnalités
  - Corrections et améliorations
  - Statistiques

- **[Statut du Projet](project/PROJECT_STATUS.md)** - État actuel du projet
  - Modules backend (19 apps)
  - Pages frontend (60+)
  - Améliorations v1.2.0 et v1.3.0
  - Métriques de qualité
  - Checklist de production

---

## 🗂️ Structure de la Documentation

```
docs/
├── README.md                      # 📍 Vous êtes ici
├── guides/                        # 🎓 Guides utilisateurs
│   ├── QUICK_START.md            # Installation rapide
│   └── CONTRIBUTING.md           # Guide de contribution
├── backend/                       # 🔧 Documentation backend
│   ├── CELERY_GUIDE.md           # Guide Celery
│   └── TESTING_GUIDE.md          # Guide des tests
├── frontend/                      # 🎨 Documentation frontend
│   ├── IMPROVEMENTS.md           # Améliorations
│   └── BACKEND_CONFORMITY.md     # Conformité API
└── project/                       # 📊 Gestion de projet
    ├── TODO.md                   # Liste des tâches
    ├── CHANGELOG.md              # Historique des versions
    └── PROJECT_STATUS.md         # Statut du projet
```

---

## 🔍 Trouver ce que vous cherchez

### Je veux...

#### ...installer le projet
👉 [Guide de Démarrage Rapide](guides/QUICK_START.md)

#### ...contribuer au code
👉 [Guide de Contribution](guides/CONTRIBUTING.md)

#### ...comprendre l'architecture
👉 [README Principal](../README.md) + [Statut du Projet](project/PROJECT_STATUS.md)

#### ...configurer Celery et les tâches asynchrones
👉 [Guide Celery](backend/CELERY_GUIDE.md)

#### ...écrire des tests
👉 [Guide de Tests](backend/TESTING_GUIDE.md)

#### ...voir l'historique des modifications
👉 [Changelog](project/CHANGELOG.md)

#### ...connaître les prochaines fonctionnalités
👉 [TODO](project/TODO.md)

#### ...vérifier la conformité des APIs
👉 [Conformité Backend-Frontend](frontend/BACKEND_CONFORMITY.md)

---

## 📝 Conventions

### Emojis utilisés dans la documentation

| Emoji | Signification |
|-------|--------------|
| ✅ | Terminé / Fonctionnel |
| ⚠️ | Attention / Partiellement fait |
| ❌ | Non implémenté / À faire |
| 🔧 | Configuration prête |
| 📝 | Documentation |
| 🚀 | Déploiement / Production |
| 🧪 | Tests |
| 🔐 | Sécurité |
| 🎨 | Frontend / UI |
| 🔧 | Backend / API |
| 📊 | Statistiques / Analytics |
| 💡 | Astuce / Note |
| ⚡ | Performance |
| 🐛 | Bug |

### Labels de priorité

- **🔴 Priorité Haute** : À faire immédiatement (v1.3.0)
- **🟡 Priorité Moyenne** : À planifier (v1.4.0)
- **🟢 Priorité Basse** : Nice to have (v2.0.0)

---

## 🆘 Support

### Problèmes et Questions

- **Issues GitHub** : [https://github.com/BabDIO/tirahou/issues](https://github.com/BabDIO/tirahou/issues)
- **Discussions** : [https://github.com/BabDIO/tirahou/discussions](https://github.com/BabDIO/tirahou/discussions)
- **Email** : tirahou@example.com

### Ressources Utiles

- **Django Documentation** : https://docs.djangoproject.com/
- **React Documentation** : https://react.dev/
- **Django REST Framework** : https://www.django-rest-framework.org/
- **Celery Documentation** : https://docs.celeryproject.org/
- **TailwindCSS** : https://tailwindcss.com/docs

---

## 🔄 Mises à Jour

Cette documentation est maintenue activement. Dernière mise à jour : **Juillet 2026**

Pour signaler une erreur ou suggérer une amélioration de la documentation :
1. Ouvrir une issue sur GitHub
2. Créer une Pull Request avec vos modifications
3. Contacter l'équipe de développement

---

## 📜 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](../LICENSE) pour plus de détails.

---

<div align="center">

**Fait avec ❤️ par l'équipe TIRAHOU**

[⬆ Retour en haut](#-documentation-tirahou)

</div>
