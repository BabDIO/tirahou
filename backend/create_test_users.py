import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.people.models import Student, Teacher, AdminStaff

User = get_user_model()

users_data = [
    {
        'email': 'admin@tirahou.edu',
        'password': 'Admin123!',
        'first_name': 'Admin',
        'last_name': 'Principal',
        'role': 'admin_institutionnel',
        'type': 'admin'
    },
    {
        'email': 'etudiant@tirahou.edu',
        'password': 'Etudiant123!',
        'first_name': 'Jean',
        'last_name': 'Dupont',
        'role': 'etudiant',
        'type': 'student',
        'student_id': 'ETU-2024-001'
    },
    {
        'email': 'enseignant@tirahou.edu',
        'password': 'Enseignant123!',
        'first_name': 'Marie',
        'last_name': 'Martin',
        'role': 'enseignant',
        'type': 'teacher',
        'grade': 'professeur'
    },
    {
        'email': 'scolarite@tirahou.edu',
        'password': 'Scolarite123!',
        'first_name': 'Pierre',
        'last_name': 'Bernard',
        'role': 'admin_scolarite',
        'type': 'admin'
    },
    {
        'email': 'financier@tirahou.edu',
        'password': 'Financier123!',
        'first_name': 'Sophie',
        'last_name': 'Dubois',
        'role': 'admin_financier',
        'type': 'admin'
    },
    {
        'email': 'responsable@tirahou.edu',
        'password': 'Responsable123!',
        'first_name': 'Luc',
        'last_name': 'Lambert',
        'role': 'responsable_pedagogique',
        'type': 'admin'
    },
    {
        'email': 'bibliothecaire@tirahou.edu',
        'password': 'Biblio123!',
        'first_name': 'Anne',
        'last_name': 'Durand',
        'role': 'bibliothecaire',
        'type': 'admin'
    }
]

print("\n🔐 CRÉATION DES UTILISATEURS DE TEST\n" + "="*50)

for user_data in users_data:
    email = user_data['email']
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'role': user_data['role'],
            'is_active': True,
            'is_staff': user_data['type'] == 'admin',
            'is_superuser': user_data['role'] == 'admin_institutionnel'
        }
    )
    
    if created:
        user.set_password(user_data['password'])
        user.save()
        
        if user_data['type'] == 'student':
            Student.objects.get_or_create(
                user=user,
                defaults={
                    'student_id': user_data['student_id'],
                    'status': 'inscrit'
                }
            )
        elif user_data['type'] == 'teacher':
            Teacher.objects.get_or_create(
                user=user,
                defaults={
                    'grade': user_data.get('grade', 'assistant')
                }
            )
        
        print(f"✅ {user_data['role'].upper()}")
        print(f"   Email    : {email}")
        print(f"   Password : {user_data['password']}")
        print()
    else:
        print(f"ℹ️  {email} existe déjà")

print("="*50)
print("✅ TOUS LES UTILISATEURS SONT PRÊTS !\n")
