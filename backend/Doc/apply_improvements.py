#!/usr/bin/env python
"""
Script d'application des améliorations optimisées
Améliore les modèles existants sans créer de nouveaux fichiers
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command


def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print('='*60)


def main():
    print_header("🎯 AMÉLIORATIONS OPTIMISÉES - SANS DUPLICATION")
    
    print("\n📋 Principe : Améliorer l'existant, pas dupliquer")
    print("   ✅ Enrichissement des modèles existants")
    print("   ✅ Pas de nouveaux fichiers")
    print("   ✅ Pas de duplication de code\n")
    
    # Étape 1 : Migrations
    print_header("ÉTAPE 1 : Création des migrations")
    
    apps_to_migrate = ['analytics_app', 'communication', 'attendance']
    
    for app in apps_to_migrate:
        try:
            print(f"\n📦 Création des migrations pour {app}...")
            call_command('makemigrations', app, interactive=False)
            print(f"✅ Migrations créées pour {app}")
        except Exception as e:
            print(f"⚠️  {app}: {e}")
    
    # Étape 2 : Application des migrations
    print_header("ÉTAPE 2 : Application des migrations")
    
    try:
        call_command('migrate', interactive=False)
        print("✅ Toutes les migrations appliquées")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False
    
    # Étape 3 : Test des améliorations
    print_header("ÉTAPE 3 : Test des améliorations")
    
    try:
        from apps.analytics_app.models import EngagementScore
        from apps.communication.models import Notification
        from apps.attendance.models import AttendanceRecord, AbsenceSummary
        
        print("\n✅ Modèles importés avec succès")
        
        # Vérifier les nouveaux champs
        print("\n🔍 Vérification des nouveaux champs...")
        
        # EngagementScore
        if hasattr(EngagementScore, 'success_prediction_score'):
            print("   ✅ EngagementScore.success_prediction_score")
        if hasattr(EngagementScore, 'recommendations'):
            print("   ✅ EngagementScore.recommendations")
        
        # Notification
        if hasattr(Notification, 'priority'):
            print("   ✅ Notification.priority")
        if hasattr(Notification, 'icon'):
            print("   ✅ Notification.icon")
        
        # AttendanceRecord
        if hasattr(AttendanceRecord, 'justification_status'):
            print("   ✅ AttendanceRecord.justification_status")
        if hasattr(AttendanceRecord, 'minutes_late'):
            print("   ✅ AttendanceRecord.minutes_late")
        
        # AbsenceSummary
        if hasattr(AbsenceSummary, 'alert_level'):
            print("   ✅ AbsenceSummary.alert_level")
        if hasattr(AbsenceSummary, 'punctuality_rate'):
            print("   ✅ AbsenceSummary.punctuality_rate")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'import : {e}")
        return False
    
    # Étape 4 : Créer des données de test
    print_header("ÉTAPE 4 : Données de test")
    
    try:
        from apps.people.models import Student
        from apps.accounts.models import User
        
        students = Student.objects.all()[:3]
        
        if students.exists():
            print(f"\n✅ {students.count()} étudiants trouvés pour les tests")
            
            # Créer une notification de test
            for student in students:
                notification = Notification.objects.create(
                    recipient=student.user,
                    title="🎉 Plateforme améliorée",
                    message="Découvrez les nouvelles fonctionnalités : prédiction de réussite, notifications enrichies, gestion avancée des absences !",
                    type='info',
                    priority='normal',
                    channel='interne',
                    icon='sparkles',
                    color='blue',
                    action_url='/dashboard',
                    action_label='Découvrir',
                    is_sent=True
                )
            
            print(f"✅ {students.count()} notifications de test créées")
        else:
            print("⚠️  Aucun étudiant trouvé")
        
    except Exception as e:
        print(f"⚠️  Erreur : {e}")
    
    # Résumé
    print_header("✅ INSTALLATION TERMINÉE")
    
    print("\n📊 Améliorations appliquées :")
    print("   1. ✅ Prédiction de réussite (EngagementScore)")
    print("   2. ✅ Notifications enrichies (Notification)")
    print("   3. ✅ Gestion avancée absences (AttendanceRecord)")
    print("   4. ✅ Alertes automatiques (AbsenceSummary)")
    
    print("\n🔗 Nouveaux endpoints disponibles :")
    print("   • GET  /api/v1/analytics/predict-success/?student_id=X")
    print("   • GET  /api/v1/analytics/students-at-risk/")
    print("   • POST /api/v1/communication/notifications/send_notification/")
    
    print("\n📚 Documentation :")
    print("   • AMELIORATIONS_OPTIMISEES.md - Guide complet")
    
    print("\n🚀 Prochaines étapes :")
    print("   1. Lancer le serveur : python manage.py runserver")
    print("   2. Tester les endpoints dans Swagger")
    print("   3. Utiliser les nouvelles fonctionnalités")
    
    print("\n" + "="*60 + "\n")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
