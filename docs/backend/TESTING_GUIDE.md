# 🧪 Guide de Tests Backend - TIRAHOU

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Configuration](#configuration)
- [Lancer les tests](#lancer-les-tests)
- [Écrire des tests](#écrire-des-tests)
- [Couverture de tests](#couverture-de-tests)
- [Tests API](#tests-api)
- [Tests de tâches Celery](#tests-de-tâches-celery)
- [Mocking](#mocking)
- [CI/CD](#cicd)

---

## 📊 Vue d'ensemble

### Frameworks utilisés

- **Django TestCase** - Tests unitaires et d'intégration
- **Django REST Framework APITestCase** - Tests d'API
- **pytest-django** (optionnel) - Alternative moderne
- **factory_boy** - Création de fixtures
- **faker** - Génération de données factices
- **coverage** - Mesure de couverture

### Structure des tests

```
backend/
├── apps/
│   ├── accounts/
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   ├── test_serializers.py
│   │   │   └── test_permissions.py
│   │   └── ...
│   └── ...
├── test_actors.py  # Tests par acteur
└── test_quick.py   # Tests rapides
```

---

## ⚙️ Configuration

### Installation des dépendances

```bash
pip install pytest pytest-django pytest-cov factory-boy faker
```

### Configuration pytest (optionnel)

Créer `backend/pytest.ini` :

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts = --reuse-db --nomigrations --cov=apps --cov-report=html --cov-report=term-missing
```

---

## 🚀 Lancer les tests

### Avec Django

```bash
# Tous les tests
python manage.py test

# Tests d'une app spécifique
python manage.py test apps.accounts

# Tests d'un module spécifique
python manage.py test apps.accounts.tests.test_views

# Tests d'une classe spécifique
python manage.py test apps.accounts.tests.test_views.UserViewTestCase

# Tests d'une méthode spécifique
python manage.py test apps.accounts.tests.test_views.UserViewTestCase.test_create_user

# Mode verbeux
python manage.py test --verbosity=2

# Parallélisation
python manage.py test --parallel
```

### Avec pytest (optionnel)

```bash
# Tous les tests
pytest

# Tests d'une app
pytest apps/accounts/

# Tests avec couverture
pytest --cov=apps --cov-report=html

# Tests spécifiques
pytest apps/accounts/tests/test_views.py::TestUserView::test_create_user

# Mode verbeux
pytest -v

# Arrêter au premier échec
pytest -x

# Relancer les tests échoués
pytest --lf
```

---

## ✍️ Écrire des tests

### 1. Tests de Modèles

**`apps/accounts/tests/test_models.py` :**

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.people.models import Student

User = get_user_model()

class StudentModelTests(TestCase):
    """Tests pour le modèle Student"""
    
    def setUp(self):
        """Configuration avant chaque test"""
        self.user = User.objects.create_user(
            email='student@test.com',
            password='testpass123',
            role='etudiant'
        )
        self.student = Student.objects.create(
            user=self.user,
            matricule='STU001',
            first_name='John',
            last_name='Doe'
        )
    
    def test_student_creation(self):
        """Test création d'un étudiant"""
        self.assertEqual(self.student.matricule, 'STU001')
        self.assertEqual(self.student.user.email, 'student@test.com')
        self.assertTrue(isinstance(self.student, Student))
    
    def test_student_str(self):
        """Test représentation string"""
        expected = f"{self.student.matricule} - John Doe"
        self.assertEqual(str(self.student), expected)
    
    def test_get_full_name(self):
        """Test méthode get_full_name"""
        self.assertEqual(self.student.get_full_name(), 'John Doe')
    
    def tearDown(self):
        """Nettoyage après chaque test"""
        self.student.delete()
        self.user.delete()
```

### 2. Tests d'API (Views)

**`apps/accounts/tests/test_views.py` :**

```python
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class UserAPITests(APITestCase):
    """Tests pour l'API des utilisateurs"""
    
    def setUp(self):
        """Configuration avant chaque test"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='adminpass123',
            role='super_admin',
            is_staff=True
        )
        self.student_user = User.objects.create_user(
            email='student@test.com',
            password='studentpass123',
            role='etudiant'
        )
        self.url = reverse('user-list')
    
    def test_list_users_as_admin(self):
        """Test liste des utilisateurs en tant qu'admin"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_list_users_as_student_forbidden(self):
        """Test liste des utilisateurs en tant qu'étudiant (interdit)"""
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_user(self):
        """Test création d'utilisateur"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'email': 'newuser@test.com',
            'password': 'newpass123',
            'role': 'enseignant'
        }
        response = self.client.post(self.url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 3)
        self.assertEqual(response.data['email'], 'newuser@test.com')
    
    def test_update_user(self):
        """Test mise à jour d'utilisateur"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': self.student_user.pk})
        data = {'role': 'doctorant'}
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.role, 'doctorant')
    
    def test_delete_user(self):
        """Test suppression d'utilisateur"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': self.student_user.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(User.objects.count(), 1)
```

### 3. Tests de Sérialiseurs

**`apps/accounts/tests/test_serializers.py` :**

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.serializers import UserSerializer

User = get_user_model()

class UserSerializerTests(TestCase):
    """Tests pour le sérialiseur User"""
    
    def test_serialize_user(self):
        """Test sérialisation d'un utilisateur"""
        user = User.objects.create_user(
            email='test@test.com',
            password='testpass123',
            role='etudiant'
        )
        serializer = UserSerializer(user)
        data = serializer.data
        
        self.assertEqual(data['email'], 'test@test.com')
        self.assertEqual(data['role'], 'etudiant')
        self.assertNotIn('password', data)  # Mot de passe ne doit pas être exposé
    
    def test_deserialize_user(self):
        """Test désérialisation d'un utilisateur"""
        data = {
            'email': 'new@test.com',
            'password': 'newpass123',
            'role': 'enseignant'
        }
        serializer = UserSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.email, 'new@test.com')
        self.assertTrue(user.check_password('newpass123'))
    
    def test_invalid_email(self):
        """Test email invalide"""
        data = {
            'email': 'invalid-email',
            'password': 'pass123',
            'role': 'etudiant'
        }
        serializer = UserSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
```

### 4. Tests de Permissions

**`apps/accounts/tests/test_permissions.py` :**

```python
from django.test import TestCase
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model
from apps.accounts.permissions import IsAdminOrReadOnly

User = get_user_model()

class PermissionTests(TestCase):
    """Tests pour les permissions personnalisées"""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='admin123',
            role='super_admin',
            is_staff=True
        )
        self.student = User.objects.create_user(
            email='student@test.com',
            password='student123',
            role='etudiant'
        )
        self.permission = IsAdminOrReadOnly()
    
    def test_admin_has_permission(self):
        """Test qu'un admin a la permission"""
        request = self.factory.post('/api/test/')
        request.user = self.admin
        
        self.assertTrue(self.permission.has_permission(request, None))
    
    def test_student_get_allowed(self):
        """Test qu'un étudiant peut lire"""
        request = self.factory.get('/api/test/')
        request.user = self.student
        
        self.assertTrue(self.permission.has_permission(request, None))
    
    def test_student_post_denied(self):
        """Test qu'un étudiant ne peut pas écrire"""
        request = self.factory.post('/api/test/')
        request.user = self.student
        
        self.assertFalse(self.permission.has_permission(request, None))
```

---

## 📊 Couverture de tests

### Générer un rapport de couverture

```bash
# Installer coverage
pip install coverage

# Lancer les tests avec coverage
coverage run --source='apps' manage.py test

# Générer un rapport en terminal
coverage report

# Générer un rapport HTML
coverage html

# Ouvrir le rapport
# Windows
start htmlcov/index.html
# Linux/Mac
open htmlcov/index.html
```

### Rapport de couverture ciblé

```bash
# Coverage pour une app spécifique
coverage run --source='apps.accounts' manage.py test apps.accounts
coverage report

# Exclure des fichiers
coverage run --omit="*/migrations/*,*/tests/*" manage.py test
coverage report
```

### Objectifs de couverture

- **Minimum acceptable** : 70%
- **Bon** : 80%
- **Excellent** : 90%+

---

## 🔧 Tests de tâches Celery

**`apps/finance/tests/test_tasks.py` :**

```python
from django.test import TestCase
from unittest.mock import patch
from apps.finance.tasks import send_payment_reminders
from apps.finance.models import Invoice
from apps.people.models import Student

class PaymentTasksTests(TestCase):
    """Tests pour les tâches Celery de paiement"""
    
    def setUp(self):
        # Créer des données de test
        self.student = Student.objects.create(...)
        self.invoice = Invoice.objects.create(
            student=self.student,
            total_amount=50000,
            status='en_attente',
            due_date=timezone.now().date() - timedelta(days=5)
        )
    
    @patch('apps.finance.tasks.Notification.objects.create')
    def test_send_payment_reminders(self, mock_notification):
        """Test envoi des rappels de paiement"""
        result = send_payment_reminders()
        
        self.assertGreater(result['overdue_reminders'], 0)
        mock_notification.assert_called()
    
    def test_task_is_registered(self):
        """Test que la tâche est enregistrée"""
        from celery import current_app
        tasks = list(current_app.tasks.keys())
        
        self.assertIn('apps.finance.tasks.send_payment_reminders', tasks)
```

---

## 🎭 Mocking

### Mocker des appels externes

```python
from unittest.mock import patch, Mock

class ExternalAPITests(TestCase):
    
    @patch('requests.get')
    def test_external_api_call(self, mock_get):
        """Test appel API externe"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': 'test'}
        mock_get.return_value = mock_response
        
        # Votre code qui appelle requests.get()
        result = some_function_that_calls_api()
        
        self.assertEqual(result['data'], 'test')
        mock_get.assert_called_once()
```

### Mocker l'envoi d'emails

```python
from django.core import mail
from django.test import TestCase

class EmailTests(TestCase):
    
    def test_send_welcome_email(self):
        """Test envoi d'email de bienvenue"""
        send_welcome_email('test@test.com')
        
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['test@test.com'])
        self.assertIn('Bienvenue', mail.outbox[0].subject)
```

---

## 🔄 CI/CD

### GitHub Actions

**`.github/workflows/tests.yml` :**

```yaml
name: Django Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install coverage
    
    - name: Run tests with coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379/0
      run: |
        cd backend
        coverage run manage.py test
        coverage report
        coverage xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
```

---

## 📝 Bonnes Pratiques

### 1. Nommage des tests

```python
# ✅ Bon
def test_user_can_create_invoice():
    ...

def test_invoice_calculation_with_discount():
    ...

# ❌ Mauvais
def test1():
    ...

def test_stuff():
    ...
```

### 2. Utiliser setUp et tearDown

```python
class MyTests(TestCase):
    def setUp(self):
        """Exécuté avant chaque test"""
        self.user = User.objects.create(...)
    
    def tearDown(self):
        """Exécuté après chaque test"""
        # Nettoyage si nécessaire (généralement automatique)
        pass
```

### 3. Tests isolés

Chaque test doit être indépendant et ne pas dépendre des autres.

### 4. Assertions claires

```python
# ✅ Bon
self.assertEqual(invoice.total_amount, 50000, "Le montant devrait être 50000")

# ❌ Moins clair
self.assertTrue(invoice.total_amount == 50000)
```

### 5. Tester les cas limites

```python
def test_division_by_zero():
    """Test division par zéro"""
    with self.assertRaises(ZeroDivisionError):
        result = 10 / 0
```

---

## 🎯 Checklist de Tests

Avant de pousser du code, vérifier :

- [ ] Tous les nouveaux modèles ont des tests
- [ ] Toutes les nouvelles vues/API ont des tests
- [ ] Les permissions sont testées
- [ ] Les cas d'erreur sont testés
- [ ] Les validations sont testées
- [ ] La couverture de tests est ≥ 80%
- [ ] Tous les tests passent localement
- [ ] Les tests ne dépendent pas de données externes

---

**Dernière mise à jour** : Juillet 2026  
**Version** : 1.3.0
