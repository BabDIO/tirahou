# Guide de Débogage - Accès aux Cours Étudiants

## 🔍 Problème : Impossible d'ouvrir les cours

### Vérifications à faire

#### 1. **Vérifier que l'étudiant a des inscriptions**

```bash
# Dans le shell Django
python manage.py shell

from apps.people.models import Student
from apps.enrollment.models import PedaEnrollment

# Récupérer l'étudiant
student = Student.objects.get(user__email="etudiant@example.com")

# Vérifier les inscriptions pédagogiques
enrollments = PedaEnrollment.objects.filter(
    admin_enrollment__student=student,
    status='confirmee'
)
print(f"Inscriptions: {enrollments.count()}")
for e in enrollments:
    print(f"- {e.semester} - {e.status}")
```

#### 2. **Vérifier que des cours existent**

```bash
from apps.lms.models import CourseSpace

# Lister tous les cours publiés
courses = CourseSpace.objects.filter(is_published=True, is_active=True)
print(f"Cours publiés: {courses.count()}")
for c in courses:
    print(f"- {c.ue.code}: {c.title}")
```

#### 3. **Vérifier le lien UE → Semestre**

```bash
from apps.programs.models import Semester

# Vérifier les UE dans les semestres
semesters = Semester.objects.all()
for sem in semesters:
    print(f"{sem.label}: {sem.ues.count()} UE(s)")
```

#### 4. **Tester l'API directement**

```bash
# Avec curl (remplacer TOKEN par votre JWT)
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:8000/api/v1/course-spaces/

# Ou avec httpie
http GET http://127.0.0.1:8000/api/v1/course-spaces/ \
  "Authorization: Bearer TOKEN"
```

## 🛠️ Solutions rapides

### Solution 1 : Créer des données de test

```python
# manage.py shell
from apps.lms.models import CourseSpace
from apps.programs.models import UE, Semester
from apps.academic.models import AcademicYear
from apps.enrollment.models import PedaEnrollment, AdminEnrollment
from apps.people.models import Student

# 1. Créer une année académique
year = AcademicYear.objects.first()

# 2. Récupérer ou créer une UE
ue = UE.objects.first()

# 3. Créer un espace de cours
course = CourseSpace.objects.create(
    ue=ue,
    academic_year=year,
    title=f"Cours {ue.name}",
    description="Description du cours",
    mode='hybride',
    is_published=True
)
print(f"Cours créé: {course.id}")

# 4. Vérifier l'inscription de l'étudiant
student = Student.objects.first()
admin_enroll = AdminEnrollment.objects.filter(student=student).first()

if admin_enroll:
    # Créer inscription pédagogique
    semester = Semester.objects.filter(program=admin_enroll.program).first()
    if semester:
        # Ajouter l'UE au semestre si pas déjà fait
        semester.ues.add(ue)
        
        peda_enroll, created = PedaEnrollment.objects.get_or_create(
            admin_enrollment=admin_enroll,
            semester=semester,
            defaults={'status': 'confirmee'}
        )
        print(f"Inscription pédagogique: {peda_enroll.id}")
```

### Solution 2 : Désactiver temporairement le filtrage

Si vous voulez voir TOUS les cours (pour tester) :

```python
# Dans apps/lms/views.py - CourseSpaceViewSet.get_queryset()
# Commenter temporairement le filtrage :

def get_queryset(self):
    if getattr(self, 'swagger_fake_view', False):
        return CourseSpace.objects.none()
    
    # TEMPORAIRE : Voir tous les cours
    return CourseSpace.objects.filter(
        is_active=True, 
        is_published=True
    ).select_related('ue', 'academic_year')
```

### Solution 3 : Vérifier les logs

```bash
# Voir les logs Django
tail -f logs/siguvh.log

# Ou lancer le serveur en mode verbose
python manage.py runserver --verbosity 2
```

## 📊 Commandes utiles

### Créer un cours de test complet

```python
from django.core.management.base import BaseCommand
from apps.lms.models import CourseSpace, CourseModule, CourseResource
from apps.programs.models import UE
from apps.academic.models import AcademicYear

# Récupérer les données
ue = UE.objects.first()
year = AcademicYear.objects.filter(is_current=True).first()

# Créer le cours
course = CourseSpace.objects.create(
    ue=ue,
    academic_year=year,
    title=f"Introduction à {ue.name}",
    description="Cours de démonstration",
    mode='hybride',
    is_published=True
)

# Créer un module
module = CourseModule.objects.create(
    course_space=course,
    title="Module 1 : Introduction",
    description="Premier module du cours",
    order=1,
    is_published=True
)

# Créer une ressource
resource = CourseResource.objects.create(
    module=module,
    title="Syllabus du cours",
    type='pdf',
    external_url="https://example.com/syllabus.pdf",
    description="Plan du cours",
    order=1,
    is_published=True
)

print(f"✅ Cours créé: {course.id}")
print(f"✅ Module créé: {module.id}")
print(f"✅ Ressource créée: {resource.id}")
```

### Vérifier les permissions

```python
from apps.accounts.models import User

user = User.objects.get(email="etudiant@example.com")
print(f"Rôles: {[r.name for r in user.roles.all()]}")
print(f"Est étudiant: {hasattr(user, 'student_profile')}")

if hasattr(user, 'student_profile'):
    student = user.student_profile
    print(f"Student ID: {student.id}")
    print(f"Programme: {student.current_program}")
```

## 🐛 Erreurs courantes

### Erreur 1 : "Aucun cours disponible"
**Cause** : Pas d'inscriptions pédagogiques confirmées
**Solution** : Créer une inscription pédagogique avec status='confirmee'

### Erreur 2 : "403 Forbidden"
**Cause** : Problème de permissions ou JWT invalide
**Solution** : Vérifier le token JWT et les rôles

### Erreur 3 : "404 Not Found"
**Cause** : Route non configurée
**Solution** : Vérifier App.tsx et les routes

### Erreur 4 : Cours visibles mais pas cliquables
**Cause** : Problème de navigation React
**Solution** : Vérifier que useNavigate() fonctionne

## 🔧 Réinitialisation complète

Si rien ne fonctionne, réinitialiser les données :

```bash
# 1. Supprimer les cours existants
python manage.py shell
>>> from apps.lms.models import CourseSpace
>>> CourseSpace.objects.all().delete()

# 2. Supprimer les inscriptions
>>> from apps.enrollment.models import PedaEnrollment
>>> PedaEnrollment.objects.all().delete()

# 3. Recréer les données de test
python manage.py shell < create_test_data.py
```

## 📞 Checklist finale

- [ ] L'étudiant a un compte actif
- [ ] L'étudiant a un profil Student
- [ ] L'étudiant a une AdminEnrollment validée
- [ ] L'étudiant a une PedaEnrollment confirmée
- [ ] Le semestre contient des UE
- [ ] Les UE ont des CourseSpace publiés
- [ ] Les CourseSpace ont is_active=True
- [ ] Le JWT token est valide
- [ ] La route /student/courses existe
- [ ] Le backend répond sur /api/v1/course-spaces/

## 🎯 Test rapide

```bash
# 1. Vérifier que le backend fonctionne
curl http://127.0.0.1:8000/api/v1/course-spaces/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Vérifier que le frontend charge
# Ouvrir http://127.0.0.1:3000/student/courses
# Ouvrir la console du navigateur (F12)
# Vérifier les erreurs réseau et console
```
