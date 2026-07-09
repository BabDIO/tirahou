import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("\n🔍 VÉRIFICATION DES UTILISATEURS\n" + "="*50)

test_accounts = [
    ('admin@tirahou.edu', 'Admin123!'),
    ('etudiant@tirahou.edu', 'Etudiant123!'),
    ('enseignant@tirahou.edu', 'Enseignant123!'),
]

for email, password in test_accounts:
    try:
        user = User.objects.get(email=email)
        pwd_ok = user.check_password(password)
        print(f"\n📧 {email}")
        print(f"   ✅ Existe: OUI")
        print(f"   ✅ Actif: {user.is_active}")
        print(f"   ✅ Mot de passe '{password}': {pwd_ok}")
        if not pwd_ok:
            print(f"   ⚠️  Le mot de passe ne correspond PAS!")
    except User.DoesNotExist:
        print(f"\n❌ {email} N'EXISTE PAS")

print("\n" + "="*50 + "\n")
