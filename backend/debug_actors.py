"""Test rapide toutes fonctionnalites par acteur"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
import requests
BASE = 'http://localhost:8000/api/v1'

def login(email, pwd):
    try:
        r = requests.post(f'{BASE}/auth/login/', json={'email': email, 'password': pwd}, timeout=3)
        return r.json().get('access') if r.status_code == 200 else None
    except: return None

def T(tok, url, label, method='GET', data=None):
    h = {'Authorization': f'Bearer {tok}'}
    try:
        r = requests.request(method, f'{BASE}{url}', headers=h, json=data, timeout=3)
        j = r.json() if r.headers.get('content-type','').startswith('application/json') else {}
        n = f"({j.get('count','?')} items)" if isinstance(j, dict) and 'count' in j else ''
        s = 'OK  ' if r.status_code < 400 else 'FAIL'
        print(f'  [{r.status_code}] {s} {label} {n}')
        return r.status_code
    except Exception as e:
        print(f'  [ERR] FAIL {label} - {str(e)[:40]}')
        return 0

ACTORS = [
    ('ADMIN',         'admin@tirahou.edu',          'Admin@2024'),
    ('SCOLARITE',     'scolarite@tirahou.edu',       'Test@2024'),
    ('FINANCIER',     'financier@tirahou.edu',       'Test@2024'),
    ('ENSEIGNANT',    'enseignant@tirahou.edu',      'Test@2024'),
    ('ETUDIANT',      'etudiant@tirahou.edu',        'Test@2024'),
    ('BIBLIOTHECAIRE','bibliothecaire@tirahou.edu',  'Test@2024'),
]

TESTS = {
    'ADMIN': [
        ('/students/', 'Etudiants'),
        ('/teachers/', 'Enseignants'),
        ('/programs/', 'Programmes'),
        ('/academic-years/', 'Annees acad.'),
        ('/universities/', 'Universites'),
        ('/invoices/', 'Factures'),
        ('/payments/', 'Paiements'),
        ('/grades/', 'Notes'),
        ('/analytics/dashboard/', 'Dashboard'),
        ('/analytics/students-at-risk/', 'At-risk'),
        ('/analytics/attendance-stats/', 'Assiduité stats'),
        ('/audit-logs/', 'Audit'),
        ('/users/', 'Utilisateurs'),
        ('/health/', 'Health'),
        ('/admin-enrollments/', 'Inscriptions'),
        ('/exam-sessions/', 'Sessions exam'),
        ('/semester-results/', 'Resultats sem.'),
        ('/sessions/', 'Seances'),
        ('/rooms/', 'Salles'),
        ('/virtual-sessions/', 'Classes virt.'),
        ('/internships/', 'Stages'),
        ('/theses/', 'Memoires'),
        ('/documents/generated-documents/', 'Docs gen.'),
        ('/notifications/', 'Notifications'),
        ('/announcements/', 'Annonces'),
        ('/library/', 'Bibliotheque'),
    ],
    'SCOLARITE': [
        ('/students/', 'Etudiants'),
        ('/admin-enrollments/', 'Inscriptions'),
        ('/applications/', 'Candidatures'),
        ('/documents/generated-documents/', 'Documents'),
        ('/grades/', 'Notes'),
        ('/semester-results/', 'Resultats'),
        ('/notifications/', 'Notifications'),
        ('/sessions/', 'Seances'),
        ('/attendance-sheets/', 'Presences'),
    ],
    'FINANCIER': [
        ('/invoices/', 'Factures'),
        ('/payments/', 'Paiements'),
        ('/scholarships/', 'Bourses'),
        ('/finance/cash-journal/', 'Journal caisse'),
        ('/fee-types/', 'Types frais'),
        ('/installments/', 'Echeanciers'),
        ('/students/', 'Etudiants (lecture)'),
    ],
    'ENSEIGNANT': [
        ('/course-spaces/', 'Mes cours'),
        ('/course-modules/', 'Modules'),
        ('/course-resources/', 'Ressources'),
        ('/assignments/', 'Devoirs'),
        ('/assignment-submissions/?page_size=5', 'Soumissions'),
        ('/quizzes/', 'Quiz'),
        ('/student-progress/', 'Progression'),
        ('/grades/', 'Notes (ses EC)'),
        ('/evaluation/teacher/grades/', 'Notes (endpoint dedie)'),
        ('/sessions/', 'Seances'),
        ('/attendance-sheets/', 'Feuilles presence'),
        ('/attendance-records/', 'Enreg. presence'),
        ('/virtual-sessions/', 'Classes virt.'),
        ('/internships/', 'Stages encadres'),
        ('/theses/', 'Memoires encadres'),
        ('/notifications/', 'Notifications'),
        ('/students/', 'Mes etudiants'),
        ('/library/', 'Bibliotheque'),
    ],
    'ETUDIANT': [
        ('/course-spaces/', 'Mes cours'),
        ('/student-progress/', 'Ma progression'),
        ('/evaluation/student/grades/', 'Mes notes (dedie)'),
        ('/evaluation/student/transcript/', 'Mon releve'),
        ('/semester-results/', 'Resultats sem.'),
        ('/ue-results/', 'Resultats UE'),
        ('/invoices/', 'Mes factures'),
        ('/documents/generated-documents/', 'Mes documents'),
        ('/absence-summaries/', 'Mon assiduité'),
        ('/sessions/', 'Mon emploi du temps'),
        ('/virtual-sessions/', 'Classes virt.'),
        ('/internships/', 'Mon stage'),
        ('/theses/', 'Mon memoire'),
        ('/notifications/', 'Mes notifications'),
        ('/library/', 'Bibliotheque'),
        ('/admin-enrollments/', 'Mon inscription'),
        ('/assignments/', 'Mes devoirs'),
        ('/quizzes/', 'Mes quiz'),
        ('/announcements/', 'Annonces'),
    ],
    'BIBLIOTHECAIRE': [
        ('/library/', 'Catalogue'),
        ('/library-borrowings/', 'Emprunts'),
        ('/library-reservations/', 'Reservations'),
        ('/library-ratings/', 'Evaluations'),
        ('/notifications/', 'Notifications'),
        ('/announcements/', 'Annonces'),
    ],
}

print()
print('=' * 55)
print('TIRAHOU - TEST FONCTIONNALITES PAR ACTEUR')
print('=' * 55)

total_ok = 0
total_fail = 0

for actor, email, pwd in ACTORS:
    print(f'\n>>> {actor} ({email})')
    tok = login(email, pwd)
    if not tok:
        print('  LOGIN FAILED')
        continue
    print('  LOGIN OK')
    for url, label in TESTS.get(actor, []):
        code = T(tok, url, label)
        if code > 0 and code < 400: total_ok += 1
        else: total_fail += 1

print()
print('=' * 55)
print(f'RESULTATS: {total_ok} OK / {total_fail} FAIL')
print('=' * 55)
