# 🚀 Guide de Démarrage Rapide

## 📋 Prérequis

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+
- **Git**

---

## 🛠️ Installation

### 1. Cloner le Projet

```bash
git clone https://github.com/BabDIO/tirahou.git
cd tirahou
```

### 2. Configuration Backend (Django)

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier le fichier d'environnement
copy .env.example .env
# Ou sur Linux/Mac
cp .env.example .env

# Modifier .env avec vos paramètres
# DATABASE_URL=postgresql://user:password@localhost:5432/memoire_db
# SECRET_KEY=your-secret-key
# DEBUG=True

# Créer la base de données
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Charger les données de test (optionnel)
python manage.py loaddata fixtures/*.json

# Lancer le serveur
python manage.py runserver
```

Le backend sera accessible sur **http://localhost:8000**

### 3. Configuration Frontend (React + Vite)

```bash
cd frontend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
copy .env.example .env
# Ou sur Linux/Mac
cp .env.example .env

# Modifier .env
# VITE_API_URL=http://localhost:8000/api/v1

# Lancer le serveur de développement
npm run dev
```

Le frontend sera accessible sur **http://localhost:5173**

---

## 🧪 Tests

### Backend

```bash
cd backend

# Tous les tests
python manage.py test

# Tests spécifiques
python manage.py test apps.evaluation
python manage.py test apps.virtual_class

# Tests rapides
python test_quick.py

# Tests des acteurs
python test_actors.py

# Couverture des tests
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Frontend

```bash
cd frontend

# Tests unitaires
npm run test

# Tests E2E (si configurés)
npm run test:e2e

# Linter
npm run lint

# Formattage
npm run format
```

---

## 📦 Build Production

### Backend

```bash
cd backend

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Créer un fichier requirements.txt à jour
pip freeze > requirements.txt
```

### Frontend

```bash
cd frontend

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

---

## 🔧 Commandes Utiles

### Backend

```bash
# Créer une migration
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate

# Créer une app Django
python manage.py startapp nom_app

# Shell Django
python manage.py shell

# Shell Django Plus (si installé)
python manage.py shell_plus

# Créer un superutilisateur
python manage.py createsuperuser

# Vider la base de données
python manage.py flush

# Exporter des données
python manage.py dumpdata app.Model > fixtures/data.json

# Importer des données
python manage.py loaddata fixtures/data.json
```

### Frontend

```bash
# Installer une dépendance
npm install package-name

# Désinstaller une dépendance
npm uninstall package-name

# Mettre à jour les dépendances
npm update

# Vérifier les vulnérabilités
npm audit

# Corriger les vulnérabilités automatiquement
npm audit fix

# Nettoyer le cache
npm cache clean --force

# Réinstaller node_modules
rm -rf node_modules package-lock.json
npm install
```

### Git

```bash
# Voir l'état
git status

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "message"

# Push
git push origin main

# Pull
git pull origin main

# Créer une branche
git checkout -b nom-branche

# Changer de branche
git checkout nom-branche

# Fusionner une branche
git merge nom-branche

# Voir l'historique
git log --oneline

# Annuler le dernier commit (garder les modifications)
git reset --soft HEAD~1

# Annuler les modifications non commitées
git checkout -- .
```

---

## 🎯 Accès aux Différentes Interfaces

### Admin Django
- URL: http://localhost:8000/admin
- Utilisez le superutilisateur créé

### API Documentation (si Swagger configuré)
- URL: http://localhost:8000/api/docs
- URL alternative: http://localhost:8000/api/redoc

### Frontend
- URL: http://localhost:5173
- Login avec les comptes créés

### Classes Virtuelles
- URL: http://localhost:5173/virtual-classes
- Nécessite une session active

### Tests
- Backend Tests: `python manage.py test`
- Frontend Tests: `npm run test`

---

## 🐛 Dépannage

### Backend ne démarre pas

```bash
# Vérifier la base de données
python manage.py dbshell

# Vérifier les migrations
python manage.py showmigrations

# Recréer la base de données
python manage.py flush
python manage.py migrate
```

### Frontend ne démarre pas

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install

# Vérifier le port
# Changer le port dans vite.config.ts si 5173 est occupé
```

### Erreurs de CORS

Vérifier dans `backend/config/settings.py` :
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### Erreurs de token JWT

```bash
# Nettoyer le localStorage dans le navigateur
# Ou reconnectez-vous
```

---

## 📚 Documentation Complète

- [IMPROVEMENTS.md](frontend/IMPROVEMENTS.md) - Améliorations détaillées
- [BACKEND_CONFORMITY.md](frontend/BACKEND_CONFORMITY.md) - Conformité backend-frontend
- [CHANGELOG.md](CHANGELOG.md) - Historique des versions

---

## 🤝 Contribution

Pour contribuer au projet :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📞 Support

Pour toute question ou problème :
- Email: support@votre-universite.edu
- Issues GitHub: https://github.com/BabDIO/tirahou/issues

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE)

---

**Dernière mise à jour** : Juillet 2026  
**Version** : 1.2.0
