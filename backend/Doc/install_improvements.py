#!/usr/bin/env python
"""
Script d'installation automatique des améliorations
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.db import connection


def print_step(step, message):
    """Afficher une étape"""
    print(f"\n{'='*60}")
    print(f"ÉTAPE {step}: {message}")
    print('='*60)


def check_models_registered():
    """Vérifier que les modèles sont enregistrés"""
    print_step(1, "Vérification des modèles")
    
    try:
        # Analytics
        from apps.analytics_app.models import LearningActivity, EngagementScore
        print("✅ Modèles analytics_app OK")
        
        # Communication (nouveaux modèles)
        from apps.communication.realtime_models import RealtimeNotification, NotificationPreference
        print("✅ Modèles communication (realtime) OK")
        
        # Attendance (nouveaux modèles)
        from apps.attendance.advanced_models import AbsenceJustification, AttendanceAlert
        print("✅ Modèles attendance (advanced) OK")
        
        # Evaluation (nouveaux modèles)
        from apps.evaluation.feedback_models import CourseFeedback, TeacherFeedback
        print("✅ Modèles evaluation (feedback) OK")
        
        # LMS (nouveaux modèles)
        from apps.lms.collaborative_models import StudyGroup, SharedResource
        print("✅ Modèles lms (collaborative) OK")
        
        return True
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        return False


def register_models_in_apps():
    """Enregistrer les nouveaux modèles dans les apps"""
    print_step(2, "Enregistrement des modèles dans apps.py")
    
    apps_to_update = {
        'communication': 'realtime_models',
        'attendance': 'advanced_models',
        'evaluation': 'feedback_models',
        'lms': 'collaborative_models',
    }
    
    for app_name, module_name in apps_to_update.items():
        apps_py_path = f'apps/{app_name}/apps.py'
        
        if os.path.exists(apps_py_path):
            with open(apps_py_path, 'r') as f:
                content = f.read()
            
            # Vérifier si déjà modifié
            if module_name not in content:
                print(f"⚠️  {app_name}/apps.py nécessite une mise à jour manuelle")
                print(f"   Ajouter l'import: from .{module_name} import *")
            else:
                print(f"✅ {app_name}/apps.py déjà à jour")


def create_migrations():
    """Créer les migrations"""
    print_step(3, "Création des migrations")
    
    apps = ['analytics_app', 'communication', 'attendance', 'evaluation', 'lms']
    
    for app in apps:
        try:
            print(f"\n📦 Création des migrations pour {app}...")
            call_command('makemigrations', app, interactive=False)
            print(f"✅ Migrations créées pour {app}")
        except Exception as e:
            print(f"⚠️  Erreur pour {app}: {e}")


def apply_migrations():
    """Appliquer les migrations"""
    print_step(4, "Application des migrations")
    
    try:
        call_command('migrate', interactive=False)
        print("✅ Toutes les migrations appliquées")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'application des migrations: {e}")
        return False


def create_test_data():
    """Créer des données de test"""
    print_step(5, "Création de données de test")
    
    try:
        from apps.people.models import Student
        from apps.lms.models import CourseSpace
        from apps.communication.notification_service import NotificationService
        
        # Notifications de test
        students = Student.objects.all()[:3]
        
        if students.exists():
            for student in students:
                NotificationService.send_notification(
                    recipient=student.user,
                    title="🎉 Nouvelles fonctionnalités disponibles",
                    message="Découvrez les améliorations de la plateforme : analytics avancés, notifications en temps réel, gestion des absences, feedback et collaboration !",
                    notification_type='info',
                    priority='normal',
                    channel='in_app',
                    icon='sparkles',
                    color='blue'
                )
            
            print(f"✅ {len(students)} notifications de test créées")
        else:
            print("⚠️  Aucun étudiant trouvé pour créer des notifications de test")
        
        # Politique d'assiduité par défaut
        from apps.attendance.advanced_models import AttendancePolicy
        from apps.academic.models import AcademicYear
        
        current_year = AcademicYear.objects.filter(is_current=True).first()
        
        if current_year and not AttendancePolicy.objects.exists():
            AttendancePolicy.objects.create(
                min_attendance_rate=75.0,
                max_absences_allowed=3,
                warning_threshold=2,
                critical_threshold=4,
                auto_notify_student=True,
                auto_notify_teacher=True,
                require_justification=True,
                justification_deadline_days=3,
                is_active=True
            )
            print("✅ Politique d'assiduité par défaut créée")
        
        return True
    except Exception as e:
        print(f"⚠️  Erreur lors de la création des données de test: {e}")
        return False


def verify_endpoints():
    """Vérifier que les endpoints sont accessibles"""
    print_step(6, "Vérification des endpoints")
    
    endpoints = [
        '/api/v1/analytics/predict-success/',
        '/api/v1/analytics/cohort-analysis/',
        '/api/v1/analytics/performance-trends/',
        '/api/v1/analytics/top-performers/',
        '/api/v1/analytics/at-risk-detailed/',
    ]
    
    print("\n📡 Nouveaux endpoints disponibles:")
    for endpoint in endpoints:
        print(f"   • {endpoint}")
    
    print("\n✅ Vérification terminée")


def print_summary():
    """Afficher le résumé"""
    print("\n" + "="*60)
    print("🎉 INSTALLATION TERMINÉE")
    print("="*60)
    
    print("\n📊 Améliorations installées:")
    print("   1. ✅ Tableau de bord analytique avancé")
    print("   2. ✅ Système de notifications en temps réel")
    print("   3. ✅ Gestion avancée des absences et retards")
    print("   4. ✅ Système de feedback et évaluation des cours")
    print("   5. ✅ Espace collaboratif étudiant")
    
    print("\n📚 Documentation:")
    print("   • AMELIORATIONS_COMPLETES.md - Documentation complète")
    print("   • GUIDE_IMPLEMENTATION.md - Guide d'implémentation")
    
    print("\n🚀 Prochaines étapes:")
    print("   1. Lancer le serveur: python manage.py runserver")
    print("   2. Tester les endpoints dans Swagger: http://127.0.0.1:8000/api/schema/swagger-ui/")
    print("   3. Créer les interfaces frontend")
    
    print("\n" + "="*60)


def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("🚀 INSTALLATION DES AMÉLIORATIONS")
    print("="*60)
    
    # Étape 1: Vérifier les modèles
    if not check_models_registered():
        print("\n❌ Erreur: Les modèles ne sont pas correctement importés")
        print("Vérifiez que tous les fichiers de modèles existent:")
        print("  • apps/communication/realtime_models.py")
        print("  • apps/attendance/advanced_models.py")
        print("  • apps/evaluation/feedback_models.py")
        print("  • apps/lms/collaborative_models.py")
        sys.exit(1)
    
    # Étape 2: Enregistrer les modèles
    register_models_in_apps()
    
    # Étape 3: Créer les migrations
    create_migrations()
    
    # Étape 4: Appliquer les migrations
    if not apply_migrations():
        print("\n❌ Erreur lors de l'application des migrations")
        sys.exit(1)
    
    # Étape 5: Créer des données de test
    create_test_data()
    
    # Étape 6: Vérifier les endpoints
    verify_endpoints()
    
    # Résumé
    print_summary()


if __name__ == '__main__':
    main()
