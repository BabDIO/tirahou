import requests
BASE = 'http://localhost:8000/api/v1'

tok = requests.post(f'{BASE}/auth/login/',
    json={'email': 'etudiant@tirahou.edu', 'password': 'Test@2024'}, timeout=5).json()['access']
h = {'Authorization': f'Bearer {tok}'}

tests = [
    ('/admin-enrollments/', 'Etudiant - Mon inscription'),
    ('/assignments/', 'Etudiant - Mes devoirs'),
    ('/quizzes/', 'Etudiant - Mes quiz'),
]
for url, label in tests:
    r = requests.get(f'{BASE}{url}', headers=h, timeout=5)
    j = r.json()
    n = j.get('count', j) if isinstance(j, dict) else j
    s = 'OK' if r.status_code < 400 else 'FAIL'
    print(f'[{r.status_code}] {s} {label}: {n}')
