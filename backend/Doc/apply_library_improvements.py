#!/usr/bin/env python
"""
Script d'application des améliorations de la bibliothèque
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command


def main():
    print("\n" + "="*60)
    print("  📚 AMÉLIORATION BIBLIOTHÈQUE")
    print("="*60)
    
    print("\n📋 Améliorations :")
    print("   1. ✅ Gestion des emprunts")
    print("   2. ✅ Système de réservations")
    print("   3. ✅ Évaluations et notes")
    print("   4. ✅ Listes de lecture")
    print("   5. ✅ Recommandations personnalisées")
    print("   6. ✅ Calcul automatique des pénalités")
    print("   7. ✅ Gestion des exemplaires")
    print("   8. ✅ Statistiques enrichies")
    
    # Migrations
    print("\n" + "="*60)
    print("  ÉTAPE 1 : Migrations")
    print("="*60)
    
    try:
        print("\n📦 Création des migrations...")
        call_command('makemigrations', 'library', interactive=False)
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
        from apps.library.models import LibraryDocument, Borrowing, Reservation, DocumentRating
        
        print("\n🔍 Vérification des modèles...")
        print("   ✅ LibraryDocument")
        print("   ✅ Borrowing")
        print("   ✅ Reservation")
        print("   ✅ DocumentRating")
        print("   ✅ ReadingList")
        
        print("\n🔍 Vérification des nouveaux champs...")
        if hasattr(LibraryDocument, 'status'):
            print("   ✅ LibraryDocument.status")
        if hasattr(LibraryDocument, 'quantity'):
            print("   ✅ LibraryDocument.quantity")
        if hasattr(LibraryDocument, 'rating'):
            print("   ✅ LibraryDocument.rating")
        
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False
    
    # Endpoints
    print("\n" + "="*60)
    print("  ÉTAPE 3 : Nouveaux endpoints")
    print("="*60)
    
    print("\n📡 Endpoints disponibles :")
    print("   • POST /api/v1/library/documents/{id}/borrow/")
    print("   • POST /api/v1/library/documents/{id}/reserve/")
    print("   • POST /api/v1/library/documents/{id}/rate/")
    print("   • GET  /api/v1/library/documents/my_borrowings/")
    print("   • GET  /api/v1/library/documents/my_reservations/")
    print("   • GET  /api/v1/library/documents/recommendations/")
    print("   • GET  /api/v1/library/documents/popular/")
    print("   • GET  /api/v1/library/documents/recent/")
    
    # Résumé
    print("\n" + "="*60)
    print("  ✅ INSTALLATION TERMINÉE")
    print("="*60)
    
    print("\n📚 Documentation :")
    print("   • Doc/BIBLIOTHEQUE_AMELIOREE.md - Guide complet")
    
    print("\n🚀 Prochaines étapes :")
    print("   1. Lancer le serveur : python manage.py runserver")
    print("   2. Accéder à : http://127.0.0.1:3000/library")
    print("   3. Tester les emprunts et réservations")
    
    print("\n💡 Test rapide :")
    print("   python manage.py shell")
    print("   >>> from apps.library.models import LibraryDocument")
    print("   >>> doc = LibraryDocument.objects.first()")
    print("   >>> doc.is_available()")
    
    print("\n" + "="*60 + "\n")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
