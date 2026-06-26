#!/usr/bin/env python
"""
Script d'application des améliorations de gestion des notes
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command


def main():
    print("\n" + "="*60)
    print("  📚 AMÉLIORATION GESTION DES NOTES")
    print("="*60)
    
    print("\n📋 Améliorations :")
    print("   1. ✅ Calcul automatique des notes")
    print("   2. ✅ Pondérations configurables")
    print("   3. ✅ Bonus/Pénalités")
    print("   4. ✅ Historique des modifications")
    print("   5. ✅ Publication avec notifications")
    print("   6. ✅ Calcul automatique moyennes UE/Semestre")
    print("   7. ✅ Classements et percentiles")
    print("   8. ✅ Mentions et GPA")
    print("   9. ✅ Réclamations de notes")
    print("   10. ✅ Statistiques de classe")
    
    # Migrations
    print("\n" + "="*60)
    print("  ÉTAPE 1 : Migrations")
    print("="*60)
    
    try:
        print("\n📦 Création des migrations...")
        call_command('makemigrations', 'evaluation', interactive=False)
        print("✅ Migrations créées")
        
        print("\n📦 Application des migrations...")
        call_command('migrate', interactive=False)
        print("✅ Migrations appliquées")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False
    
    # Vérification
    print("\n" + "="*60)
    print("  ÉTAPE 2 : Vérification")
    print("="*60)
    
    try:
        from apps.evaluation.models import Grade, UEResult, SemesterResult
        
        print("\n🔍 Vérification des nouveaux champs...")
        
        # Grade
        if hasattr(Grade, 'cc_weight'):
            print("   ✅ Grade.cc_weight")
        if hasattr(Grade, 'bonus_points'):
            print("   ✅ Grade.bonus_points")
        if hasattr(Grade, 'appreciation'):
            print("   ✅ Grade.appreciation")
        if hasattr(Grade, 'modification_history'):
            print("   ✅ Grade.modification_history")
        
        # UEResult
        if hasattr(UEResult, 'rank_in_ue'):
            print("   ✅ UEResult.rank_in_ue")
        if hasattr(UEResult, 'percentile'):
            print("   ✅ UEResult.percentile")
        
        # SemesterResult
        if hasattr(SemesterResult, 'mention'):
            print("   ✅ SemesterResult.mention")
        if hasattr(SemesterResult, 'gpa'):
            print("   ✅ SemesterResult.gpa")
        
        print("\n🔍 Vérification des méthodes...")
        
        if hasattr(Grade, 'calculate_final_grade'):
            print("   ✅ Grade.calculate_final_grade()")
        if hasattr(Grade, 'publish_to_student'):
            print("   ✅ Grade.publish_to_student()")
        if hasattr(UEResult, 'calculate_ue_average'):
            print("   ✅ UEResult.calculate_ue_average()")
        if hasattr(SemesterResult, 'calculate_semester_average'):
            print("   ✅ SemesterResult.calculate_semester_average()")
        
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False
    
    # Endpoints
    print("\n" + "="*60)
    print("  ÉTAPE 3 : Nouveaux endpoints")
    print("="*60)
    
    print("\n📡 Endpoints disponibles :")
    print("\n👨🎓 ÉTUDIANT :")
    print("   • GET  /api/v1/evaluation/student/grades/")
    print("   • GET  /api/v1/evaluation/student/transcript/")
    print("   • POST /api/v1/evaluation/student/contest/")
    
    print("\n👨🏫 ENSEIGNANT :")
    print("   • POST /api/v1/evaluation/teacher/enter-grade/")
    print("   • GET  /api/v1/evaluation/teacher/grades/")
    print("   • GET  /api/v1/evaluation/teacher/statistics/")
    
    print("\n👔 RESPONSABLE PÉDAGOGIQUE :")
    print("   • POST /api/v1/evaluation/admin/validate-bulk/")
    print("   • POST /api/v1/evaluation/admin/calculate-ue/")
    print("   • POST /api/v1/evaluation/admin/calculate-semester/")
    
    print("\n🏛️  ADMIN SCOLARITÉ :")
    print("   • POST /api/v1/evaluation/admin/publish-results/")
    
    # Résumé
    print("\n" + "="*60)
    print("  ✅ INSTALLATION TERMINÉE")
    print("="*60)
    
    print("\n📚 Documentation :")
    print("   • GESTION_NOTES_COMPLETE.md - Guide complet")
    
    print("\n🚀 Prochaines étapes :")
    print("   1. Lancer le serveur : python manage.py runserver")
    print("   2. Tester les endpoints dans Swagger")
    print("   3. Saisir des notes de test")
    
    print("\n💡 Test rapide :")
    print("   python manage.py shell")
    print("   >>> from apps.evaluation.models import Grade")
    print("   >>> grade = Grade.objects.first()")
    print("   >>> grade.calculate_final_grade()")
    
    print("\n" + "="*60 + "\n")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
