"""
Script pour créer des données de test pour les cours étudiants
Usage: python manage.py shell < create_test_courses.py
"""

from apps.lms.models import CourseSpace, CourseModule, CourseResource
from apps.programs.models import UE, Semester, Program
from apps.academic.models import AcademicYear
from apps.enrollment.models import PedaEnrollment, AdminEnrollment
from apps.people.models import Student
from apps.accounts.models import User

print("🚀 Création des données de test pour les cours...")

# 1. Récupérer ou créer une année académique
year, created = AcademicYear.objects.get_or_create(
    label="2024-2025",
    defaults={
        'start_date': '2024-09-01',
        'end_date': '2025-06-30',
        'is_current': True
    }
)
print(f"✅ Année académique: {year.label}")

# 2. Récupérer un programme
program = Program.objects.first()
if not program:
    print("❌ Aucun programme trouvé. Créez d'abord un programme.")
    exit()
print(f"✅ Programme: {program.name}")

# 3. Récupérer ou créer des semestres
semester, created = Semester.objects.get_or_create(
    program=program,
    number=1,
    defaults={
        'label': 'Semestre 1',
        'total_credits': 30
    }
)
print(f"✅ Semestre: {semester.label}")

# 4. Récupérer ou créer des UE
ue_data = [
    {'code': 'INF101', 'name': 'Introduction à la Programmation', 'credits': 6},
    {'code': 'MAT101', 'name': 'Mathématiques pour l\'Informatique', 'credits': 6},
    {'code': 'ANG101', 'name': 'Anglais Technique', 'credits': 3},
]

ues = []
for data in ue_data:
    ue, created = UE.objects.get_or_create(
        code=data['code'],
        defaults={
            'name': data['name'],
            'credits': data['credits'],
            'coefficient': 1.0,
            'volume_hours': 40,
            'type': 'fondamentale',
            'eval_mode': 'cc_examen',
            'compensation_allowed': True,
            'passing_grade': 10.0
        }
    )
    semester.ues.add(ue)
    ues.append(ue)
    print(f"✅ UE: {ue.code} - {ue.name}")

# 5. Créer des espaces de cours
modes = ['hybride', 'distanciel_async', 'presentiel']
for i, ue in enumerate(ues):
    course, created = CourseSpace.objects.get_or_create(
        ue=ue,
        academic_year=year,
        defaults={
            'title': f"Cours {ue.name}",
            'description': f"Ce cours couvre les fondamentaux de {ue.name.lower()}",
            'mode': modes[i % len(modes)],
            'is_published': True
        }
    )
    
    if created:
        print(f"✅ Cours créé: {course.title} ({course.mode})")
        
        # Créer des modules
        for j in range(1, 4):
            module = CourseModule.objects.create(
                course_space=course,
                title=f"Module {j}",
                description=f"Contenu du module {j}",
                order=j,
                is_published=True
            )
            
            # Créer des ressources
            resources_data = [
                {'title': f'Cours {j} - Slides', 'type': 'pdf'},
                {'title': f'Cours {j} - Vidéo', 'type': 'video'},
                {'title': f'Exercices {j}', 'type': 'pdf'},
            ]
            
            for k, res_data in enumerate(resources_data):
                CourseResource.objects.create(
                    module=module,
                    title=res_data['title'],
                    type=res_data['type'],
                    external_url=f"https://example.com/{res_data['type']}/{j}/{k}",
                    description=f"Ressource {res_data['title']}",
                    order=k + 1,
                    is_published=True,
                    is_downloadable=True,
                    duration_minutes=30 if res_data['type'] == 'video' else None
                )
            
            print(f"  ✅ Module {j} avec {len(resources_data)} ressources")

# 6. Créer des inscriptions pour les étudiants
students = Student.objects.all()[:5]  # Prendre les 5 premiers étudiants

for student in students:
    # Créer inscription administrative si elle n'existe pas
    admin_enroll, created = AdminEnrollment.objects.get_or_create(
        student=student,
        program=program,
        academic_year=year,
        defaults={
            'enrollment_number': f'INS{year.label.split("-")[0]}{student.student_id}',
            'type': 'nouveau',
            'status': 'validee',
            'payment_validated': True
        }
    )
    
    # Créer inscription pédagogique
    peda_enroll, created = PedaEnrollment.objects.get_or_create(
        admin_enrollment=admin_enroll,
        semester=semester,
        defaults={
            'status': 'confirmee'
        }
    )
    
    if created:
        print(f"✅ Inscription créée pour: {student.user.get_full_name()}")
    
    # Créer les inscriptions aux UE
    from apps.enrollment.models import UEEnrollment
    for ue in ues:
        ue_enroll, created = UEEnrollment.objects.get_or_create(
            peda_enrollment=peda_enroll,
            ue=ue,
            defaults={
                'is_optional': False
            }
        )
        if created:
            print(f"  ✅ Inscrit à l'UE: {ue.code}")

print("\n🎉 Données de test créées avec succès!")
print(f"📊 Résumé:")
print(f"  - {CourseSpace.objects.filter(is_published=True).count()} cours publiés")
print(f"  - {CourseModule.objects.filter(is_published=True).count()} modules")
print(f"  - {CourseResource.objects.filter(is_published=True).count()} ressources")
print(f"  - {PedaEnrollment.objects.filter(status='confirmee').count()} inscriptions pédagogiques")
from apps.enrollment.models import UEEnrollment
print(f"  - {UEEnrollment.objects.count()} inscriptions UE")
print("\n✅ Les étudiants peuvent maintenant accéder à leurs cours!")
