"""
Renomme les comptes de test hérités du domaine @uvhci.edu (ancien nom du
projet avant le renommage en TIRAHOU, voir change_name_to_tirahou.py) avec
des noms maliens authentiques, à la place des noms ivoiriens/akans (Affoué,
Akissi, Kouamé, N'Guessan, Yao...) utilisés par l'ancien générateur de
données de test — incohérents avec `nationality = 'Malienne'` par défaut
sur Student.

Usage : python rename_uvhci_accounts_to_malian.py
"""
import os
import random

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

MALE_FIRST = [
    'Mamadou', 'Ousmane', 'Ibrahim', 'Modibo', 'Seydou', 'Boubacar', 'Amadou', 'Souleymane',
    'Moussa', 'Aliou', 'Yacouba', 'Abdoulaye', 'Bakary', 'Adama', 'Cheickna', 'Drissa',
    'Brehima', 'Youssouf', 'Lassana', 'Salif', 'Sidiki', 'Zoumana', 'Issa', 'Mahamadou',
    'Sory', 'Baba', 'Kalilou', 'Idrissa', 'Amara', 'Hamidou',
]
FEMALE_FIRST = [
    'Aminata', 'Fatoumata', 'Awa', 'Mariam', 'Kadiatou', 'Assitan', 'Djeneba', 'Oumou',
    'Salimata', 'Aissata', 'Rokia', 'Bintou', 'Hawa', 'Nana', 'Sira', 'Fanta',
    'Korotoumou', 'Fatim', 'Sitan', 'Coumba', 'Ramata', 'Djelika', 'Tenin', 'Maimouna',
    'Habibatou', 'Alima', 'Kani', 'Kadia', 'Bassa', 'Niouma',
]
SURNAMES = [
    'Traore', 'Diarra', 'Keita', 'Kone', 'Coulibaly', 'Cisse', 'Diallo', 'Toure',
    'Sidibe', 'Konate', 'Sangare', 'Camara', 'Doumbia', 'Diakite', 'Maiga', 'Sissoko',
    'Dembele', 'Samake', 'Fofana', 'Kante', 'Berthe', 'Tounkara', 'Sacko', 'Kouyate',
    'Sanogo', 'Haidara', 'Bagayoko', 'Diabate', 'Tandia', 'Djire',
]

random.seed(42)  # reproductible d'une exécution à l'autre

users = list(User.objects.filter(email__iendswith='@uvhci.edu').order_by('email'))
updated = 0

for user in users:
    student = getattr(user, 'student_profile', None)
    if student and student.gender == 'F':
        pool = FEMALE_FIRST
    elif student and student.gender == 'M':
        pool = MALE_FIRST
    else:
        # Enseignants et autres : pas de champ genre, on alterne au hasard.
        pool = random.choice([MALE_FIRST, FEMALE_FIRST])

    user.first_name = random.choice(pool)
    user.last_name = random.choice(SURNAMES)
    user.save(update_fields=['first_name', 'last_name'])
    updated += 1

print(f"OK {updated} comptes @uvhci.edu renommés avec des noms maliens.")
