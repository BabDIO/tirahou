"""
TIRAHOU — Script de données de démonstration
Exécuter : python seed_demo_data.py
Peuple la base avec des données réalistes pour les captures d'écran du mémoire.
"""
import os
import sys
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from datetime import date, timedelta
import random

print("=" * 60)
print("TIRAHOU — Chargement des données de démonstration")
print("=" * 60)

# ── 1. ROLES ─────────────────────────────────────────────────────────────────
from apps.accounts.models import Role, User

ROLES = [
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'admin_financier', 'responsable_pedagogique', 'chef_departement',
    'enseignant', 'tuteur', 'etudiant', 'doctorant',
    'bibliothecaire', 'invite', 'support_technique',
]
roles = {}
for r in ROLES:
    obj, _ = Role.objects.get_or_create(name=r)
    roles[r] = obj
    print(f"  Role : {r}")
print(f"✓ {len(roles)} rôles créés")

# ── 2. UTILISATEURS ──────────────────────────────────────────────────────────
def create_user(email, first, last, role_key, password='Test@2024'):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': first,
            'last_name': last,
            'is_active': True,
            'is_verified': True,
        }
    )
    if created:
        user.set_password(password)
        user.save()
    user.roles.add(roles[role_key])
    return user

admin_user     = create_user('admin@tirahou.edu',         'Kouassi',   'ADMIN',      'super_admin',            'Admin@2024')
scolarite_user = create_user('scolarite@tirahou.edu',     'Aya',       'KONE',       'admin_scolarite')
financier_user = create_user('financier@tirahou.edu',     'Mamadou',   'DIALLO',     'admin_financier')
resp_user      = create_user('responsable@tirahou.edu',   'Alphonse',  'YAO',        'responsable_pedagogique')
chef_user      = create_user('chef.dept@tirahou.edu',     'Brice',     'OUATTARA',   'chef_departement')
enseignant1    = create_user('enseignant@tirahou.edu',    'Dr. Amara', 'TRAORE',     'enseignant')
enseignant2    = create_user('enseignant2@tirahou.edu',   'Dr. Fatou', 'CAMARA',     'enseignant')
tuteur_user    = create_user('tuteur@tirahou.edu',        'Eric',      'BAMBA',      'tuteur')
biblio_user    = create_user('bibliothecaire@tirahou.edu','Marie',     'KOUAME',     'bibliothecaire')
etudiant1_user = create_user('etudiant@tirahou.edu',      'Jean-Paul', 'KOUASSI',    'etudiant')
etudiant2_user = create_user('etudiant2@tirahou.edu',     'Fatoumata', 'COULIBALY',  'etudiant')
etudiant3_user = create_user('etudiant3@tirahou.edu',     'Moussa',    'SANGARE',    'etudiant')
etudiant4_user = create_user('etudiant4@tirahou.edu',     'Aminata',   'BALDE',      'etudiant')
etudiant5_user = create_user('etudiant5@tirahou.edu',     'Ibrahim',   'TOURE',      'etudiant')
doctorant_user = create_user('doctorant@tirahou.edu',     'Dr. Sékou', 'FOFANA',     'doctorant')

print(f"✓ Utilisateurs créés (admin: admin@tirahou.edu / Admin@2024)")

# ── 3. STRUCTURE ACADÉMIQUE ──────────────────────────────────────────────────
from apps.academic.models import University, Faculty, Department, AcademicYear, LMDRegulation

univ, _ = University.objects.get_or_create(
    acronym='UVHCI',
    defaults={
        'name': 'Université Virtuelle Hybride de Côte d\'Ivoire',
        'address': 'Abidjan, Plateau, Côte d\'Ivoire',
        'website': 'https://uvhci.edu.ci',
        'email': 'contact@uvhci.edu.ci',
        'phone': '+225 27 20 00 00 00',
        'rector': admin_user,
    }
)

fac_info, _ = Faculty.objects.get_or_create(
    acronym='UFR-INFO',
    defaults={'university': univ, 'name': 'UFR Informatique & Numérique', 'email': 'info@uvhci.edu.ci', 'dean': resp_user}
)
fac_gestion, _ = Faculty.objects.get_or_create(
    acronym='UFR-GESTION',
    defaults={'university': univ, 'name': 'UFR Sciences de Gestion', 'email': 'gestion@uvhci.edu.ci'}
)

dept_gl, _ = Department.objects.get_or_create(
    acronym='DGL',
    defaults={'faculty': fac_info, 'name': 'Département Génie Logiciel', 'head': chef_user}
)
dept_ia, _ = Department.objects.get_or_create(
    acronym='DIA',
    defaults={'faculty': fac_info, 'name': 'Département Intelligence Artificielle'}
)
dept_rsx, _ = Department.objects.get_or_create(
    acronym='DRSX',
    defaults={'faculty': fac_info, 'name': 'Département Réseaux & Systèmes'}
)

year, _ = AcademicYear.objects.get_or_create(
    label='2024-2025',
    defaults={
        'start_date': date(2024, 9, 1),
        'end_date': date(2025, 7, 31),
        'is_current': True,
        'candidature_start': date(2024, 6, 1),
        'candidature_end': date(2024, 7, 31),
        'admin_enrollment_start': date(2024, 9, 1),
        'admin_enrollment_end': date(2024, 10, 15),
        'peda_enrollment_start': date(2024, 9, 15),
        'peda_enrollment_end': date(2024, 10, 30),
        'courses_start': date(2024, 11, 1),
        'courses_end': date(2025, 5, 31),
        'exams_start': date(2025, 6, 1),
        'exams_end': date(2025, 6, 30),
        'deliberation_date': date(2025, 7, 15),
    }
)

reg_licence, _ = LMDRegulation.objects.get_or_create(
    name='Règlement Licence UVHCI',
    defaults={
        'cycle': 'licence', 'university': univ, 'effective_year': year,
        'credits_per_semester': 30, 'total_credits': 180,
        'passing_grade': Decimal('10.00'), 'compensation_allowed': True,
        'compensation_min_grade': Decimal('8.00'), 'max_years_allowed': 5,
    }
)
reg_master, _ = LMDRegulation.objects.get_or_create(
    name='Règlement Master UVHCI',
    defaults={
        'cycle': 'master', 'university': univ, 'effective_year': year,
        'credits_per_semester': 30, 'total_credits': 120,
        'passing_grade': Decimal('10.00'), 'compensation_allowed': True,
        'max_years_allowed': 4,
    }
)

print(f"✓ Structure académique : {univ.acronym}, {Faculty.objects.count()} facultés, {Department.objects.count()} départements")

# ── 4. PROGRAMMES & MAQUETTES LMD ────────────────────────────────────────────
from apps.programs.models import Program, Semester, UE, EC, Group

prog_gl, _ = Program.objects.get_or_create(
    code='L3-GL',
    defaults={
        'name': 'Licence Génie Logiciel', 'type': 'licence', 'mode': 'hybride',
        'department': dept_gl, 'regulation': reg_licence, 'responsible': resp_user,
        'duration_semesters': 6, 'capacity': 60, 'fees': Decimal('350000'),
        'status': 'active', 'candidature_open': True,
        'description': 'Formation en développement logiciel, architecture et qualité.',
    }
)
prog_ia, _ = Program.objects.get_or_create(
    code='M2-IA',
    defaults={
        'name': 'Master Intelligence Artificielle', 'type': 'master', 'mode': 'hybride',
        'department': dept_ia, 'regulation': reg_master, 'responsible': chef_user,
        'duration_semesters': 4, 'capacity': 30, 'fees': Decimal('550000'),
        'status': 'active', 'candidature_open': True,
    }
)
prog_rsx, _ = Program.objects.get_or_create(
    code='L3-RSX',
    defaults={
        'name': 'Licence Réseaux & Systèmes', 'type': 'licence', 'mode': 'presentiel',
        'department': dept_rsx, 'regulation': reg_licence, 'responsible': resp_user,
        'duration_semesters': 6, 'capacity': 45, 'fees': Decimal('320000'),
        'status': 'active',
    }
)

# Semestres programme L3-GL
s5, _ = Semester.objects.get_or_create(program=prog_gl, number=5, defaults={'label': 'Semestre 5', 'academic_year': year, 'total_credits': 30})
s6, _ = Semester.objects.get_or_create(program=prog_gl, number=6, defaults={'label': 'Semestre 6', 'academic_year': year, 'total_credits': 30})

# UE Semestre 5
ue_archi, _ = UE.objects.get_or_create(semester=s5, code='INF501', defaults={'name': 'Architecture Logicielle', 'type': 'fondamentale', 'credits': 6, 'coefficient': Decimal('2.0'), 'eval_mode': 'mixte', 'responsible': enseignant1})
ue_web, _   = UE.objects.get_or_create(semester=s5, code='INF502', defaults={'name': 'Développement Web Avancé', 'type': 'fondamentale', 'credits': 6, 'coefficient': Decimal('2.0'), 'eval_mode': 'mixte', 'responsible': enseignant2})
ue_bd, _    = UE.objects.get_or_create(semester=s5, code='INF503', defaults={'name': 'Bases de Données Avancées', 'type': 'fondamentale', 'credits': 6, 'coefficient': Decimal('2.0'), 'eval_mode': 'mixte'})
ue_algo, _  = UE.objects.get_or_create(semester=s5, code='INF504', defaults={'name': 'Algorithmique & Complexité', 'type': 'fondamentale', 'credits': 6, 'coefficient': Decimal('2.0'), 'eval_mode': 'mixte'})
ue_ang, _   = UE.objects.get_or_create(semester=s5, code='ANG501', defaults={'name': 'Anglais Technique', 'type': 'transversale', 'credits': 3, 'coefficient': Decimal('1.0'), 'eval_mode': 'controle_continu'})
ue_opt, _   = UE.objects.get_or_create(semester=s5, code='INF505', defaults={'name': 'Sécurité Informatique', 'type': 'optionnelle', 'credits': 3, 'coefficient': Decimal('1.0'), 'eval_mode': 'mixte'})

# EC pour INF501
ec1, _ = EC.objects.get_or_create(ue=ue_archi, code='INF501-CM', defaults={'name': 'Cours Magistral Architecture', 'activity_type': 'cm', 'volume_hours': 30, 'coefficient': Decimal('2.0')})
ec2, _ = EC.objects.get_or_create(ue=ue_archi, code='INF501-TD', defaults={'name': 'TD Architecture', 'activity_type': 'td', 'volume_hours': 15, 'coefficient': Decimal('1.0')})
ec3, _ = EC.objects.get_or_create(ue=ue_web,   code='INF502-CM', defaults={'name': 'Cours Web Avancé', 'activity_type': 'cm', 'volume_hours': 30, 'coefficient': Decimal('2.0')})
ec4, _ = EC.objects.get_or_create(ue=ue_web,   code='INF502-TP', defaults={'name': 'TP Web', 'activity_type': 'tp', 'volume_hours': 20, 'coefficient': Decimal('1.5')})
ec5, _ = EC.objects.get_or_create(ue=ue_bd,    code='INF503-CM', defaults={'name': 'BD Avancées Cours', 'activity_type': 'cm', 'volume_hours': 25, 'coefficient': Decimal('2.0')})
ec6, _ = EC.objects.get_or_create(ue=ue_bd,    code='INF503-TP', defaults={'name': 'TP Bases de Données', 'activity_type': 'tp', 'volume_hours': 20, 'coefficient': Decimal('1.5')})

# Affecter enseignants aux EC
ec1.teachers.add(enseignant1)
ec2.teachers.add(enseignant1)
ec3.teachers.add(enseignant2)
ec4.teachers.add(enseignant2)
ec5.teachers.add(enseignant1)
ec6.teachers.add(enseignant1)

# Groupes pédagogiques
grp_l3a, _ = Group.objects.get_or_create(program=prog_gl, academic_year=year, name='L3-GL-A', defaults={'type': 'promotion', 'capacity': 30})
grp_l3b, _ = Group.objects.get_or_create(program=prog_gl, academic_year=year, name='L3-GL-B', defaults={'type': 'promotion', 'capacity': 30})
grp_td1, _ = Group.objects.get_or_create(program=prog_gl, academic_year=year, name='TD-GL-1', defaults={'type': 'td', 'capacity': 15})

print(f"✓ Programmes : {Program.objects.count()} | Semestres : {Semester.objects.count()} | UE : {UE.objects.count()} | EC : {EC.objects.count()}")

# ── 5. PROFILS PERSONNES ─────────────────────────────────────────────────────
from apps.people.models import Student, Teacher, AdminStaff

def make_student(user, student_id, program, status='inscrit', level=3, bac_series='D', bac_year=2021):
    s, _ = Student.objects.get_or_create(user=user, defaults={
        'student_id': student_id,
        'gender': random.choice(['M', 'F']),
        'birth_date': date(2001, random.randint(1,12), random.randint(1,28)),
        'birth_place': random.choice(['Abidjan','Bouaké','Yamoussoukro','Daloa','San-Pédro']),
        'nationality': 'Ivoirienne',
        'address': f'{random.randint(1,200)} Rue des Étudiants, Abidjan',
        'current_program': program,
        'current_year': year,
        'current_level': level,
        'status': status,
        'baccalaureate_year': bac_year,
        'baccalaureate_series': bac_series,
        'baccalaureate_mention': random.choice(['Passable','Assez Bien','Bien']),
        'emergency_contact_name': 'Parent ' + user.last_name,
        'emergency_contact_phone': f'+225 07 {random.randint(10,99)} {random.randint(10,99)} {random.randint(10,99)} {random.randint(10,99)}',
    })
    return s

etu1 = make_student(etudiant1_user, 'ETU-2024-001', prog_gl)
etu2 = make_student(etudiant2_user, 'ETU-2024-002', prog_gl)
etu3 = make_student(etudiant3_user, 'ETU-2024-003', prog_gl, bac_series='C')
etu4 = make_student(etudiant4_user, 'ETU-2024-004', prog_gl, status='inscrit')
etu5 = make_student(etudiant5_user, 'ETU-2024-005', prog_ia, level=1)
doc1 = make_student(doctorant_user, 'DOC-2024-001', prog_ia, status='inscrit', level=1)

# Enseignants
def make_teacher(user, tid, grade='maitre_assistant'):
    t, _ = Teacher.objects.get_or_create(user=user, defaults={
        'teacher_id': tid,
        'grade': grade,
        'status': 'permanent',
        'department': dept_gl,
        'specialities': 'Génie Logiciel, Architecture, IA',
        'bio': f'Enseignant spécialisé en informatique à UVHCI.',
        'office': f'Bâtiment A - Bureau {random.randint(100,350)}',
        'weekly_hours_quota': 8,
    })
    return t

teach1 = make_teacher(enseignant1, 'ENS-2024-001', 'professeur')
teach2 = make_teacher(enseignant2, 'ENS-2024-002', 'maitre_conference')
teach3 = make_teacher(tuteur_user,  'TUT-2024-001', 'assistant')

staff1, _ = AdminStaff.objects.get_or_create(user=scolarite_user, defaults={'staff_id': 'ADM-2024-001', 'service': 'scolarite', 'position': 'Chef de service scolarité'})
staff2, _ = AdminStaff.objects.get_or_create(user=financier_user, defaults={'staff_id': 'ADM-2024-002', 'service': 'finance', 'position': 'Gestionnaire financier'})
staff3, _ = AdminStaff.objects.get_or_create(user=biblio_user, defaults={'staff_id': 'ADM-2024-003', 'service': 'bibliotheque', 'position': 'Bibliothécaire principale'})

print(f"✓ Étudiants : {Student.objects.count()} | Enseignants : {Teacher.objects.count()} | Personnel : {AdminStaff.objects.count()}")

# ── 6. ADMISSIONS ────────────────────────────────────────────────────────────
from apps.admissions.models import Application, AdmissionDecision

def make_application(user, program, status='converti', score=None):
    app, _ = Application.objects.get_or_create(
        applicant=user, program=program, academic_year=year,
        defaults={
            'status': status,
            'submitted_at': timezone.now() - timedelta(days=60),
            'last_diploma': 'Baccalauréat',
            'last_diploma_year': 2021,
            'last_institution': 'Lycée Moderne d\'Abidjan',
            'average_grade': Decimal(str(score or round(random.uniform(12, 17), 2))),
            'motivation_letter': 'Je souhaite intégrer ce programme pour développer mes compétences en informatique.',
            'application_fee_paid': True,
            'application_fee_amount': Decimal('15000'),
            'score': Decimal(str(score or round(random.uniform(14, 18), 2))),
        }
    )
    if status == 'converti' and not hasattr(app, 'decision'):
        AdmissionDecision.objects.get_or_create(
            application=app,
            defaults={
                'decision': 'admis',
                'decided_by': scolarite_user,
                'notes': 'Dossier excellent.',
                'accepted_by_student': True,
                'accepted_at': timezone.now() - timedelta(days=45),
            }
        )
    return app

app1 = make_application(etudiant1_user, prog_gl, score=15.5)
app2 = make_application(etudiant2_user, prog_gl, score=14.2)
app3 = make_application(etudiant3_user, prog_gl, score=16.0)
app4 = make_application(etudiant4_user, prog_gl, score=13.8)
app5 = make_application(etudiant5_user, prog_ia, score=17.1)

# Candidature en cours (pour dashboard admissions)
app_pending = Application.objects.get_or_create(
    applicant=create_user('candidat1@gmail.com', 'Adjoua', 'NIANGORAN', 'invite'),
    program=prog_gl, academic_year=year,
    defaults={
        'status': 'en_instruction',
        'submitted_at': timezone.now() - timedelta(days=5),
        'last_diploma': 'Baccalauréat C',
        'last_diploma_year': 2023,
        'average_grade': Decimal('15.00'),
        'score': Decimal('15.5'),
        'application_fee_paid': True,
        'application_fee_amount': Decimal('15000'),
    }
)[0]

print(f"✓ Candidatures : {Application.objects.count()}")

# ── 7. INSCRIPTIONS ──────────────────────────────────────────────────────────
from apps.enrollment.models import AdminEnrollment, PedaEnrollment, UEEnrollment

def make_enrollment(student, program, group):
    admin_enr, _ = AdminEnrollment.objects.get_or_create(
        student=student, academic_year=year, program=program,
        defaults={
            'type': 'premiere_inscription',
            'status': 'validee',
            'validated_by': scolarite_user,
            'validated_at': timezone.now() - timedelta(days=40),
            'payment_validated': True,
        }
    )
    peda_enr, _ = PedaEnrollment.objects.get_or_create(
        admin_enrollment=admin_enr, semester=s5,
        defaults={
            'group': group,
            'status': 'confirmee',
            'confirmed_at': timezone.now() - timedelta(days=35),
        }
    )
    # Inscrire aux UE fondamentales
    for ue in [ue_archi, ue_web, ue_bd, ue_algo, ue_ang]:
        UEEnrollment.objects.get_or_create(peda_enrollment=peda_enr, ue=ue)
    return admin_enr, peda_enr

enr1, penr1 = make_enrollment(etu1, prog_gl, grp_l3a)
enr2, penr2 = make_enrollment(etu2, prog_gl, grp_l3a)
enr3, penr3 = make_enrollment(etu3, prog_gl, grp_l3b)
enr4, penr4 = make_enrollment(etu4, prog_gl, grp_l3b)

print(f"✓ Inscriptions admin : {AdminEnrollment.objects.count()} | Péda : {PedaEnrollment.objects.count()}")

# ── 8. FINANCE ───────────────────────────────────────────────────────────────
from apps.finance.models import FeeType, Invoice, InvoiceItem, Payment, Scholarship

fee_inscr, _ = FeeType.objects.get_or_create(
    name='Frais d\'inscription 2024-2025', category='inscription', academic_year=year,
    defaults={'amount': Decimal('350000'), 'is_mandatory': True}
)
fee_cand, _ = FeeType.objects.get_or_create(
    name='Frais de candidature 2024-2025', category='candidature', academic_year=year,
    defaults={'amount': Decimal('15000'), 'is_mandatory': True}
)

def make_invoice(student, status='payee', paid_fraction=1.0):
    inv, created = Invoice.objects.get_or_create(
        student=student, academic_year=year,
        defaults={
            'status': status,
            'total_amount': Decimal('350000'),
            'paid_amount': Decimal(str(350000 * paid_fraction)),
            'discount_amount': Decimal('0'),
            'due_date': date(2024, 10, 31),
        }
    )
    if created:
        InvoiceItem.objects.get_or_create(
            invoice=inv, fee_type=fee_inscr,
            defaults={'label': 'Frais de scolarité L3-GL 2024-2025', 'amount': Decimal('350000')}
        )
        if paid_fraction > 0:
            Payment.objects.get_or_create(
                invoice=inv,
                defaults={
                    'amount': Decimal(str(int(350000 * paid_fraction))),
                    'method': random.choice(['caisse', 'mobile_money', 'virement']),
                    'status': 'valide',
                    'paid_at': timezone.now() - timedelta(days=random.randint(10, 35)),
                    'validated_by': financier_user,
                }
            )
    return inv

inv1 = make_invoice(etu1, 'payee', 1.0)
inv2 = make_invoice(etu2, 'payee', 1.0)
inv3 = make_invoice(etu3, 'partiellement_payee', 0.5)
inv4 = make_invoice(etu4, 'emise', 0.0)

# Bourse pour etu3
Scholarship.objects.get_or_create(
    student=etu3, academic_year=year,
    defaults={
        'type': 'bourse',
        'amount': Decimal('175000'),
        'percentage': Decimal('50'),
        'reason': 'Bourse d\'excellence académique',
        'granted_by': admin_user,
    }
)

print(f"✓ Factures : {Invoice.objects.count()} | Paiements : {Payment.objects.count()} | Bourses : {Scholarship.objects.count()}")

# ── 9. LMS — ESPACES DE COURS ────────────────────────────────────────────────
from apps.lms.models import CourseSpace, CourseModule, CourseResource, Assignment, StudentProgress

cs_archi, _ = CourseSpace.objects.get_or_create(
    ue=ue_archi, academic_year=year,
    defaults={
        'title': 'Architecture Logicielle — L3-GL S5',
        'description': 'Cours d\'architecture logicielle : patterns, microservices, DDD et qualité du code.',
        'mode': 'hybride',
        'is_published': True,
    }
)
cs_archi.teachers.add(enseignant1)
cs_archi.enrolled_students.add(etu1, etu2, etu3, etu4)

cs_web, _ = CourseSpace.objects.get_or_create(
    ue=ue_web, academic_year=year,
    defaults={
        'title': 'Développement Web Avancé — L3-GL S5',
        'description': 'React, Django REST, TypeScript, déploiement cloud.',
        'mode': 'hybride', 'is_published': True,
    }
)
cs_web.teachers.add(enseignant2)
cs_web.enrolled_students.add(etu1, etu2, etu3, etu4)

cs_bd, _ = CourseSpace.objects.get_or_create(
    ue=ue_bd, academic_year=year,
    defaults={
        'title': 'Bases de Données Avancées — L3-GL S5',
        'description': 'PostgreSQL avancé, optimisation, NoSQL, sharding.',
        'mode': 'presentiel', 'is_published': True,
    }
)
cs_bd.teachers.add(enseignant1)
cs_bd.enrolled_students.add(etu1, etu2, etu3, etu4)

# Modules pour Architecture Logicielle
mod1, _ = CourseModule.objects.get_or_create(
    course_space=cs_archi, title='Module 1 : Introduction aux Design Patterns',
    defaults={'order': 1, 'is_published': True, 'description': 'GoF patterns : Factory, Singleton, Observer, Strategy...'}
)
mod2, _ = CourseModule.objects.get_or_create(
    course_space=cs_archi, title='Module 2 : Architecture Microservices',
    defaults={'order': 2, 'is_published': True, 'description': 'Découpage en services, API Gateway, communication inter-services.'}
)
mod3, _ = CourseModule.objects.get_or_create(
    course_space=cs_archi, title='Module 3 : Domain-Driven Design (DDD)',
    defaults={'order': 3, 'is_published': True, 'description': 'Bounded contexts, aggregates, domain events.'}
)
mod4, _ = CourseModule.objects.get_or_create(
    course_space=cs_archi, title='Module 4 : Qualité & Tests Logiciels',
    defaults={'order': 4, 'is_published': False, 'description': 'TDD, BDD, tests unitaires, intégration, e2e.'}
)

# Ressources pédagogiques
for mod, resources in [
    (mod1, [('Cours Design Patterns PDF', 'pdf'), ('Slides GoF Patterns', 'ppt'), ('TP Patterns en Python', 'doc')]),
    (mod2, [('Introduction Microservices', 'pdf'), ('Vidéo : Architecture Netflix', 'video'), ('Lien : Martin Fowler Blog', 'link')]),
    (mod3, [('Livre DDD — Eric Evans (résumé)', 'pdf'), ('Exercices DDD', 'doc')]),
]:
    for i, (title, rtype) in enumerate(resources):
        CourseResource.objects.get_or_create(
            module=mod, title=title,
            defaults={
                'type': rtype,
                'order': i + 1,
                'is_published': True,
                'is_downloadable': True,
                'uploaded_by': enseignant1,
                'file_size': random.randint(100000, 5000000),
            }
        )

# Devoirs
Assignment.objects.get_or_create(
    course_space=cs_archi, title='TP1 — Implémentation des Design Patterns',
    defaults={
        'type': 'devoir',
        'instructions': 'Implémenter 3 design patterns GoF en Python avec des cas d\'usage réels. Documenter votre code.',
        'max_grade': Decimal('20'),
        'open_date': timezone.now() - timedelta(days=14),
        'due_date': timezone.now() + timedelta(days=7),
        'status': 'publie',
        'created_by': enseignant1,
        'allowed_formats': 'pdf,zip,py',
    }
)
Assignment.objects.get_or_create(
    course_space=cs_web, title='Projet — Application Web Full Stack',
    defaults={
        'type': 'projet',
        'instructions': 'Développer une application web complète avec React + Django REST. Déploiement sur cloud obligatoire.',
        'max_grade': Decimal('20'),
        'open_date': timezone.now() - timedelta(days=7),
        'due_date': timezone.now() + timedelta(days=21),
        'status': 'publie',
        'created_by': enseignant2,
        'allowed_formats': 'pdf,zip',
    }
)

# Progression des étudiants
progress_data = [
    (etu1, cs_archi, 78, 420), (etu2, cs_archi, 45, 180),
    (etu3, cs_archi, 92, 650), (etu4, cs_archi, 23, 90),
    (etu1, cs_web, 85, 380),   (etu2, cs_web, 60, 240),
    (etu3, cs_web, 100, 720),  (etu4, cs_web, 15, 60),
]
for stu, cs, comp_rate, time_min in progress_data:
    StudentProgress.objects.update_or_create(
        student=stu, course_space=cs,
        defaults={
            'resources_viewed': int(comp_rate / 10),
            'total_resources': 10,
            'completion_rate': Decimal(str(comp_rate)),
            'last_access': timezone.now() - timedelta(days=random.randint(0, 5)),
            'total_time_minutes': time_min,
        }
    )

print(f"✓ Espaces cours : {CourseSpace.objects.count()} | Modules : {CourseModule.objects.count()} | Ressources : {CourseResource.objects.count()}")
