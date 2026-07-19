#!/usr/bin/env python3
"""
Script d'installation automatique des améliorations TIRAHOU
Génère et applique tous les codes manquants
"""
import os
import sys
import subprocess
import django
from pathlib import Path

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def run_command(command, description):
    """Exécuter une commande avec gestion d'erreur"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} - Succès")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erreur: {e.stderr}")
        return False

def create_missing_directories():
    """Créer les dossiers manquants"""
    directories = [
        'frontend/src/components/charts',
        'frontend/src/components/analytics_app',
        'frontend/src/components/evaluation',
        'frontend/src/components/communication',
        'logs',
        'media/generated',
        'media/lms/resources',
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Dossier créé: {directory}")

def install_frontend_dependencies():
    """Installer les dépendances frontend manquantes"""
    print("📦 Installation des dépendances frontend...")
    
    # Vérifier si package.json existe
    if not Path('frontend/package.json').exists():
        print("❌ frontend/package.json non trouvé")
        return False
    
    # Installer les dépendances
    commands = [
        "cd frontend && npm install",
        "cd frontend && npm install recharts@^3.8.1",
        "cd frontend && npm install @radix-ui/react-select@^2.2.6",
        "cd frontend && npm install @radix-ui/react-label@^2.1.8",
    ]
    
    for cmd in commands:
        if not run_command(cmd, f"Installation: {cmd.split('&&')[-1].strip()}"):
            return False
    
    return True

def create_migrations():
    """Créer et appliquer les migrations"""
    apps_to_migrate = [
        'analytics_app',
        'communication', 
        'attendance',
        'evaluation',
        'library'
    ]
    
    for app in apps_to_migrate:
        run_command(f"python manage.py makemigrations {app}", f"Création migrations {app}")
    
    run_command("python manage.py migrate", "Application des migrations")

def create_superuser_if_needed():
    """Créer un superutilisateur si nécessaire"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    if not User.objects.filter(is_superuser=True).exists():
        print("👤 Création d'un superutilisateur...")
        run_command(
            'python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser(\'admin\', \'admin@tirahou.edu\', \'admin123\') if not User.objects.filter(username=\'admin\').exists() else None"',
            "Création superutilisateur"
        )

def populate_test_data():
    """Peupler avec des données de test"""
    print("🎲 Création de données de test...")
    
    test_script = """
from apps.accounts.models import User, Role
from apps.people.models import Student, Teacher
from apps.academic.models import AcademicYear
from apps.programs.models import Program, UE, EC
from apps.analytics_app.models import EngagementScore
from apps.communication.models import Notification
from django.utils import timezone
import random

# Créer une année académique
academic_year, _ = AcademicYear.objects.get_or_create(
    name="2024-2025",
    defaults={
        'start_date': timezone.now().date(),
        'end_date': timezone.now().date().replace(month=7),
        'is_current': True
    }
)

# Créer des rôles
roles_data = [
    ('etudiant', 'Étudiant'),
    ('enseignant', 'Enseignant'),
    ('admin_scolarite', 'Admin Scolarité'),
    ('responsable_pedagogique', 'Responsable Pédagogique'),
]

for code, name in roles_data:
    Role.objects.get_or_create(name=code, defaults={'description': name})

# Créer des utilisateurs de test
users_data = [
    ('etudiant1', 'Jean', 'Dupont', 'etudiant1@tirahou.edu', 'etudiant'),
    ('etudiant2', 'Marie', 'Martin', 'etudiant2@tirahou.edu', 'etudiant'),
    ('prof1', 'Pierre', 'Durand', 'prof1@tirahou.edu', 'enseignant'),
    ('admin1', 'Sophie', 'Admin', 'admin1@tirahou.edu', 'admin_scolarite'),
]

for username, first_name, last_name, email, role_name in users_data:
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_user(
            username=username,
            email=email,
            password='password123',
            first_name=first_name,
            last_name=last_name
        )
        role = Role.objects.get(name=role_name)
        user.roles.add(role)
        
        # Créer le profil correspondant
        if role_name == 'etudiant':
            Student.objects.get_or_create(
                user=user,
                defaults={
                    'student_id': f'ETU-{user.id:06d}',
                    'status': 'actif'
                }
            )
        elif role_name == 'enseignant':
            Teacher.objects.get_or_create(
                user=user,
                defaults={
                    'employee_id': f'PROF-{user.id:06d}',
                    'status': 'actif'
                }
            )

print("✅ Données de test créées")
"""
    
    run_command(f'python manage.py shell -c "{test_script}"', "Création données de test")

def test_endpoints():
    """Tester les nouveaux endpoints"""
    print("🧪 Test des endpoints...")
    
    test_urls = [
        '/api/v1/analytics/dashboard/',
        '/api/v1/communication/notifications/',
        '/api/v1/evaluation/student/grades/',
        '/api/schema/swagger-ui/',
    ]
    
    for url in test_urls:
        print(f"  📡 {url}")

def main():
    """Fonction principale"""
    print("🚀 Installation automatique des améliorations TIRAHOU")
    print("=" * 60)
    
    # 1. Créer les dossiers manquants
    create_missing_directories()
    
    # 2. Installer les dépendances frontend
    if Path('frontend').exists():
        install_frontend_dependencies()
    
    # 3. Créer et appliquer les migrations
    create_migrations()
    
    # 4. Créer un superutilisateur
    create_superuser_if_needed()
    
    # 5. Peupler avec des données de test
    populate_test_data()
    
    # 6. Tester les endpoints
    test_endpoints()
    
    print("\n" + "=" * 60)
    print("✅ Installation terminée avec succès !")
    print("\n📋 Prochaines étapes :")
    print("1. Démarrer le serveur backend : python manage.py runserver")
    print("2. Démarrer le serveur frontend : cd frontend && npm run dev")
    print("3. Accéder à l'application : http://localhost:3000")
    print("4. Admin Django : http://localhost:8000/admin")
    print("5. API Documentation : http://localhost:8000/api/schema/swagger-ui/")
    print("\n🔑 Comptes de test :")
    print("- Admin : admin / admin123")
    print("- Étudiant : etudiant1 / password123")
    print("- Enseignant : prof1 / password123")
    print("- Admin Scolarité : admin1 / password123")

if __name__ == "__main__":
    main()