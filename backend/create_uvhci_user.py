#!/usr/bin/env python
"""
Création du compte étudiant student097@uvhci.edu
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, Role
from apps.people.models import Student

def create_student():
    email = 'student097@uvhci.edu'
    password = '1223@Cisse'
    
    # Créer ou récupérer l'utilisateur
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': 'student097',
            'first_name': 'Cisse',
            'last_name': 'Student097',
            'is_active': True,
            'is_verified': True,
        }
    )
    
    if created:
        user.set_password(password)
        user.save()
        print(f"✅ Utilisateur créé: {email}")
    else:
        # Réinitialiser le mot de passe
        user.set_password(password)
        user.is_active = True
        user.save()
        print(f"✅ Utilisateur mis à jour: {email}")
    
    # Assigner le rôle étudiant
    role, _ = Role.objects.get_or_create(name='etudiant', defaults={'description': 'Étudiant'})
    user.roles.add(role)
    
    # Créer un profil étudiant si inexistant
    student, created = Student.objects.get_or_create(
        user=user,
        defaults={
            'student_id': 'STU097',
            'status': 'inscrit',
            'gender': 'M',
        }
    )
    
    if created:
        print(f"✅ Profil étudiant créé: {student.student_id}")
    else:
        print(f"✅ Profil étudiant existant: {student.student_id}")
    
    # Vérifier le mot de passe
    check = user.check_password(password)
    print(f"✅ Vérification mot de passe: {check}")
    
    print(f"\n📧 Email: {email}")
    print(f"🔑 Mot de passe: {password}")
    print(f"👤 Actif: {user.is_active}")

if __name__ == '__main__':
    create_student()
