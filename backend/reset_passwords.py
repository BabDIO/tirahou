import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Mots de passe à réinitialiser
passwords = {
    'admin@tirahou.edu': 'Admin123!',
    'etudiant@tirahou.edu': 'Etudiant123!',
    'enseignant@tirahou.edu': 'Enseignant123!',
    'scolarite@tirahou.edu': 'Scolarite123!',
    'financier@tirahou.edu': 'Financier123!',
    'responsable@tirahou.edu': 'Responsable123!',
    'bibliothecaire@tirahou.edu': 'Biblio123!',
}

print("\n🔐 RÉINITIALISATION DES MOTS DE PASSE\n" + "="*50)

for email, password in passwords.items():
    try:
        user = User.objects.get(email=email)
        user.set_password(password)
        user.is_active = True  # S'assurer que le compte est actif
        user.save()
        print(f"✅ {email} → {password}")
    except User.DoesNotExist:
        print(f"❌ {email} n'existe pas")

print("="*50)
print("✅ MOTS DE PASSE RÉINITIALISÉS !\n")
