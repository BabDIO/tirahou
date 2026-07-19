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
print("TIRAHOU  Chargement des donnes de dmonstration")
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
print(f"OK {len(roles)} rles crs")

# ── 2. UTILISATEURS ──────────────────────────────────────────────────────────
def create_user(email, first, last, role_key, password='Test@2024'):
    # Générer un username unique basé sur l'email
    base_username = email.split('@')[0]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exclude(email=email).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
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

print(f"OK Utilisateurs crs (admin: admin@tirahou.edu / Admin@2024)")

# ── 3. STRUCTURE ACADÉMIQUE ──────────────────────────────────────────────────
from apps.academic.models import University, Faculty, Department, AcademicYear, LMDRegulation

univ, _ = University.objects.get_or_create(
    acronym='UVHM',
    defaults={
        'name': 'Université Virtuelle Hybride du Mali',
        'address': 'ACI 2000, Hamdallaye, Bamako, Mali',
        'website': 'https://uvhm.edu.ml',
        'email': 'contact@uvhm.edu.ml',
        'phone': '+223 20 22 00 00',
        'rector': admin_user,
    }
)

fac_info, _ = Faculty.objects.get_or_create(
    acronym='UFR-INFO',
    defaults={'university': univ, 'name': 'UFR Informatique & Numérique', 'email': 'info@uvhm.edu.ml', 'dean': resp_user}
)
fac_gestion, _ = Faculty.objects.get_or_create(
    acronym='UFR-GESTION',
    defaults={'university': univ, 'name': 'UFR Sciences de Gestion', 'email': 'gestion@uvhm.edu.ml'}
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
    name='Règlement Licence UVHM',
    defaults={
        'cycle': 'licence', 'university': univ, 'effective_year': year,
        'credits_per_semester': 30, 'total_credits': 180,
        'passing_grade': Decimal('10.00'), 'compensation_allowed': True,
        'compensation_min_grade': Decimal('8.00'), 'max_years_allowed': 5,
    }
)
reg_master, _ = LMDRegulation.objects.get_or_create(
    name='Règlement Master UVHM',
    defaults={
        'cycle': 'master', 'university': univ, 'effective_year': year,
        'credits_per_semester': 30, 'total_credits': 120,
        'passing_grade': Decimal('10.00'), 'compensation_allowed': True,
        'max_years_allowed': 4,
    }
)

print(f"OK Structure acadmique : {univ.acronym}, {Faculty.objects.count()} facults, {Department.objects.count()} dpartements")

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

print(f"OK Programmes : {Program.objects.count()} | Semestres : {Semester.objects.count()} | UE : {UE.objects.count()} | EC : {EC.objects.count()}")

# ── 5. PROFILS PERSONNES ─────────────────────────────────────────────────────
from apps.people.models import Student, Teacher, AdminStaff

def make_student(user, student_id, program, status='inscrit', level=3, bac_series='D', bac_year=2021):
    s, _ = Student.objects.get_or_create(user=user, defaults={
        'student_id': student_id,
        'gender': random.choice(['M', 'F']),
        'birth_date': date(2001, random.randint(1,12), random.randint(1,28)),
        'birth_place': random.choice(['Bamako','Sikasso','Mopti','Kayes','Ségou']),
        'nationality': 'Malienne',
        'address': f'{random.randint(1,200)} Rue des Étudiants, Bamako',
        'current_program': program,
        'current_year': year,
        'current_level': level,
        'status': status,
        'baccalaureate_year': bac_year,
        'baccalaureate_series': bac_series,
        'baccalaureate_mention': random.choice(['Passable','Assez Bien','Bien']),
        'emergency_contact_name': 'Parent ' + user.last_name,
        'emergency_contact_phone': f'+223 76 {random.randint(10,99)} {random.randint(10,99)} {random.randint(10,99)}',
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
        'bio': f'Enseignant spécialisé en informatique à UVHM.',
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

print(f"OK tudiants : {Student.objects.count()} | Enseignants : {Teacher.objects.count()} | Personnel : {AdminStaff.objects.count()}")

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
            'last_institution': 'Lycée Askia Mohamed de Bamako',
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

print(f"OK Candidatures : {Application.objects.count()}")

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

print(f"OK Inscriptions admin : {AdminEnrollment.objects.count()} | Pda : {PedaEnrollment.objects.count()}")

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

print(f"OK Factures : {Invoice.objects.count()} | Paiements : {Payment.objects.count()} | Bourses : {Scholarship.objects.count()}")

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

print(f"OK Espaces cours : {CourseSpace.objects.count()} | Modules : {CourseModule.objects.count()} | Ressources : {CourseResource.objects.count()}")

# ── 10. ÉVALUATION — NOTES ───────────────────────────────────────────────────
from apps.evaluation.models import ExamSession, Grade, UEResult, SemesterResult

session1, _ = ExamSession.objects.get_or_create(
    semester=s5, academic_year=year, session_type='session1',
    defaults={'start_date': date(2025, 1, 6), 'end_date': date(2025, 1, 17), 'is_open': False}
)

grades_data = [
    # (étudiant, ec, cc, exam, absent)
    (etu1, ec1, 14.5, 13.0, False), (etu1, ec2, 15.0, 16.0, False),
    (etu1, ec3, 13.5, 12.5, False), (etu1, ec4, 14.0, 15.0, False),
    (etu1, ec5, 16.0, 17.5, False), (etu1, ec6, 15.5, 14.0, False),
    (etu2, ec1, 11.0,  9.5, False), (etu2, ec2, 12.0, 10.0, False),
    (etu2, ec3, 10.5, 11.0, False), (etu2, ec4,  9.0, 10.5, False),
    (etu2, ec5, 13.0, 12.0, False), (etu2, ec6, 11.5, 10.0, False),
    (etu3, ec1, 18.0, 17.0, False), (etu3, ec2, 16.5, 18.0, False),
    (etu3, ec3, 17.0, 16.5, False), (etu3, ec4, 15.5, 17.0, False),
    (etu3, ec5, 19.0, 18.5, False), (etu3, ec6, 17.5, 16.0, False),
    (etu4, ec1,  8.5,  7.0, False), (etu4, ec2,  9.0,  8.5, False),
    (etu4, ec3,  7.5,  8.0, False), (etu4, ec4,  6.0,  0.0, True),
    (etu4, ec5, 10.0,  9.5, False), (etu4, ec6,  8.0,  7.5, False),
]

from decimal import Decimal as D
for stu, ec, cc, exam, absent in grades_data:
    g, created = Grade.objects.get_or_create(
        student=stu, ec=ec, exam_session=session1,
        defaults={
            'cc_grade': D(str(cc)),
            'exam_grade': D(str(exam)) if not absent else None,
            'is_absent': absent,
            'status': 'publiee',
            'entered_by': enseignant1,
            'validated_by': resp_user,
            'validated_at': timezone.now() - timedelta(days=5),
            'published_to_student': True,
            'published_at': timezone.now() - timedelta(days=3),
        }
    )
    if created:
        g.calculate_final_grade()
        g.save()

# Résultats d'UE
for stu, avg, credits, decision in [
    (etu1, D('14.3'), 6, 'valide'),
    (etu2, D('10.8'), 6, 'valide'),
    (etu3, D('17.4'), 6, 'valide'),
    (etu4, D('8.2'),  0, 'ajourné'),
]:
    UEResult.objects.get_or_create(
        student=stu, ue=ue_archi, exam_session=session1,
        defaults={'average': avg, 'credits_obtained': credits, 'decision': decision}
    )

# Résultats semestriels
for stu, avg, credits, decision, mention, rank in [
    (etu1, D('14.1'), 27, 'admis',  'Bien',       2),
    (etu2, D('11.2'), 24, 'admis',  'Passable',    3),
    (etu3, D('17.2'), 30, 'admis',  'Très Bien',   1),
    (etu4, D('8.4'),   6, 'ajourné', '',            4),
]:
    SemesterResult.objects.get_or_create(
        student=stu, semester=s5, exam_session=session1,
        defaults={
            'average': avg,
            'total_credits': 30,
            'credits_obtained': credits,
            'decision': decision,
            'mention': mention,
            'gpa': D(str(round(float(avg)/20*4, 2))),
            'rank': rank,
            'total_students_in_semester': 4,
            'published': True,
            'published_at': timezone.now() - timedelta(days=3),
        }
    )

print(f"OK Notes : {Grade.objects.count()} | Rsultats UE : {UEResult.objects.count()} | Rsultats sem : {SemesterResult.objects.count()}")

# ── 11. PRÉSENCES & EMPLOI DU TEMPS ─────────────────────────────────────────
from apps.scheduling_app.models import Room, ScheduledSession, Timetable
from apps.attendance.models import AttendanceSheet, AttendanceRecord, AbsenceSummary

salle_a1, _ = Room.objects.get_or_create(code='A101', defaults={'name': 'Amphi A - Bloc Informatique', 'type': 'amphi', 'capacity': 80, 'building': 'Bloc A', 'has_projector': True, 'has_internet': True})
salle_td1, _ = Room.objects.get_or_create(code='TD201', defaults={'name': 'Salle TD-201', 'type': 'salle_td', 'capacity': 25, 'building': 'Bloc B', 'has_projector': True})
salle_info, _ = Room.objects.get_or_create(code='INFO301', defaults={'name': 'Salle Informatique 301', 'type': 'salle_info', 'capacity': 30, 'building': 'Bloc C', 'has_computer': True, 'has_internet': True})
salle_virt, _ = Room.objects.get_or_create(code='VIRT01', defaults={'name': 'Salle Virtuelle 1', 'type': 'virtuelle', 'capacity': 100, 'is_virtual': True})

from datetime import datetime
def dt(d, h, m): return timezone.make_aware(datetime(2025, d[0], d[1], h, m))

sessions_data = [
    (ec1, enseignant1, salle_a1,   grp_l3a, dt((1,13), 8, 0),  dt((1,13), 10, 0), 'presentiel', 'realise'),
    (ec1, enseignant1, salle_a1,   grp_l3a, dt((1,20), 8, 0),  dt((1,20), 10, 0), 'presentiel', 'realise'),
    (ec2, enseignant1, salle_td1,  grp_l3a, dt((1,14), 14, 0), dt((1,14), 16, 0), 'presentiel', 'realise'),
    (ec3, enseignant2, salle_info, grp_l3a, dt((1,15), 10, 0), dt((1,15), 12, 0), 'hybride',    'realise'),
    (ec4, enseignant2, salle_info, grp_l3a, dt((1,16), 14, 0), dt((1,16), 16, 0), 'presentiel', 'realise'),
    (ec1, enseignant1, salle_a1,   grp_l3a, dt((2,3),  8, 0),  dt((2,3),  10, 0), 'presentiel', 'confirme'),
    (ec3, enseignant2, salle_info, grp_l3a, dt((2,5),  10, 0), dt((2,5),  12, 0), 'hybride',    'planifie'),
]
scheduled_sessions = []
for ec_obj, teacher, room, group, start, end, mode, status in sessions_data:
    sess, _ = ScheduledSession.objects.get_or_create(
        ec=ec_obj, teacher=teacher, start_datetime=start,
        defaults={'end_datetime': end, 'room': room, 'group': group, 'academic_year': year, 'mode': mode, 'status': status}
    )
    scheduled_sessions.append(sess)

# Feuilles de présence pour les séances réalisées
for sess in [s for s, d in zip(scheduled_sessions, sessions_data) if d[7] == 'realise']:
    sheet, _ = AttendanceSheet.objects.get_or_create(
        session=sess,
        defaults={'is_open': False, 'opened_at': sess.start_datetime, 'closed_at': sess.end_datetime, 'created_by': sess.teacher}
    )
    presence_map = {etu1: 'present', etu2: 'present', etu3: 'present', etu4: random.choice(['present','absent'])}
    for stu, stat in presence_map.items():
        AttendanceRecord.objects.get_or_create(
            sheet=sheet, student=stu,
            defaults={'status': stat, 'method': random.choice(['qr_code','code_seance','manuel']), 'marked_at': sess.start_datetime + timedelta(minutes=random.randint(0,10))}
        )

# Résumés d'assiduité
for stu, rate, absent, present, alert in [
    (etu1, 95, 1, 19, 'none'),
    (etu2, 85, 3, 17, 'none'),
    (etu3, 100, 0, 20, 'none'),
    (etu4, 55, 9, 11, 'critical'),
]:
    AbsenceSummary.objects.update_or_create(
        student=stu, course_space=cs_archi,
        defaults={'total_sessions': 20, 'present_count': present, 'absent_count': absent, 'justified_count': 0, 'attendance_rate': D(str(rate)), 'alert_level': alert, 'unjustified_count': absent}
    )

print(f"OK Salles : {Room.objects.count()} | Sances : {ScheduledSession.objects.count()} | Feuilles prsence : {AttendanceSheet.objects.count()}")

# ── 12. DOCUMENTS GÉNÉRÉS ────────────────────────────────────────────────────
from apps.documents.models import DocumentCategory, StudentDocument, GeneratedDocument

cat_id, _ = DocumentCategory.objects.get_or_create(name='Pièce d\'identité', defaults={'code': 'CNI', 'requires_validation': True})
cat_dipl, _ = DocumentCategory.objects.get_or_create(name='Diplôme', defaults={'code': 'DIPL', 'requires_validation': True})
cat_rel, _ = DocumentCategory.objects.get_or_create(name='Relevé de notes', defaults={'code': 'RELEVE', 'requires_validation': False})

for stu, dtype, title, status in [
    (etu1, 'certificat_scolarite',    'Certificat de scolarité — KOUASSI Jean-Paul',  'delivre'),
    (etu1, 'releve_notes',            'Relevé de notes S5 — KOUASSI Jean-Paul',        'delivre'),
    (etu2, 'certificat_scolarite',    'Certificat de scolarité — COULIBALY Fatoumata', 'signe'),
    (etu3, 'certificat_scolarite',    'Certificat de scolarité — SANGARE Moussa',      'delivre'),
    (etu3, 'attestation_reussite',    'Attestation de réussite S5 — SANGARE Moussa',   'genere'),
]:
    GeneratedDocument.objects.get_or_create(
        student=stu, doc_type=dtype,
        defaults={
            'title': title,
            'status': status,
            'generated_by': scolarite_user,
        }
    )

print(f"OK Documents gnrs : {GeneratedDocument.objects.count()}")

# ── 13. ANALYTICS — ENGAGEMENT ───────────────────────────────────────────────
from apps.analytics_app.models import LearningActivity, EngagementScore, DashboardStat

for stu, conn, time_min, res_viewed, assignments, quizzes, forum, vclass, completion, risk in [
    (etu1, 45, 1200, 18,  2, 3, 5, 2, D('78'), 'faible'),
    (etu2, 22, 580,  9,   1, 1, 1, 1, D('45'), 'moyen'),
    (etu3, 68, 1850, 24,  2, 4, 9, 3, D('95'), 'faible'),
    (etu4,  8, 150,  3,   0, 0, 0, 0, D('18'), 'critique'),
]:
    score, _ = EngagementScore.objects.update_or_create(
        student=stu, course_space=cs_archi, academic_year=year,
        defaults={
            'connection_count': conn,
            'total_time_minutes': time_min,
            'resources_viewed': res_viewed,
            'assignments_submitted': assignments,
            'quizzes_attempted': quizzes,
            'forum_posts': forum,
            'virtual_class_attended': vclass,
            'completion_rate': completion,
            'engagement_score': D(str(round(conn*0.3 + float(completion)*0.3 + assignments*5, 1))),
            'dropout_risk': risk,
            'days_inactive': random.randint(0, 15) if risk != 'critique' else 45,
            'success_prediction_score': D(str(round(float(completion)*0.6 + conn*0.4, 1))),
        }
    )

# Statistiques dashboard
for stat_type, label, value in [
    ('effectifs',    'Total étudiants inscrits',    1247),
    ('inscriptions', 'Taux d\'inscription',           87),
    ('paiements',    'Taux de collecte (%)',           78),
    ('resultats',    'Moyenne générale /20',         12.4),
    ('assiduité',    'Taux d\'assiduité moyen (%)',   84),
    ('lms',          'Espaces de cours actifs',        42),
]:
    DashboardStat.objects.update_or_create(
        academic_year=year, stat_type=stat_type, label=label,
        defaults={'value': D(str(value))}
    )

print(f"OK Scores engagement : {EngagementScore.objects.count()} | Stats dashboard : {DashboardStat.objects.count()}")

# ── 14. COMMUNICATION — NOTIFICATIONS & ANNONCES ────────────────────────────
from apps.communication.models import Notification, Announcement

notifs = [
    (etudiant1_user, 'resultat',    'urgent', '🎓 Résultats S5 disponibles', 'Vos résultats du Semestre 5 sont publiés. Moyenne : 14.1/20 — Mention : Bien', '/my-grades'),
    (etudiant1_user, 'paiement',    'normal', '✅ Paiement confirmé', 'Votre paiement de 350 000 FCFA a été validé. Reçu : RECU-A1B2C3D4', '/my-finance'),
    (etudiant2_user, 'absence',     'high',   '! Alerte assiduité', 'Votre taux de présence est insuffisant. Veuillez régulariser votre situation.', '/my-attendance-student'),
    (etudiant3_user, 'resultat',    'urgent', '🏆 Félicitations !', 'Mention Très Bien — 17.2/20 au S5. Vous êtes classé 1er de votre promotion.', '/my-grades'),
    (etudiant4_user, 'absence',     'urgent', '🚨 Risque d\'exclusion', 'Votre taux d\'assiduité est critique (55%). Contactez la scolarité immédiatement.', '/my-attendance-student'),
    (etudiant4_user, 'resultat',    'high',   '📊 Résultats S5 — Action requise', 'Vous avez été ajourné(e) en S5. Session de rattrapage prévue en juillet.', '/my-grades'),
    (enseignant1, 'info',      'normal', '📋 Délibérations S5', 'Le PV de délibération du S5 est disponible. Merci de le signer avant le 25/01.', '/evaluation'),
    (admin_user,     'alerte',      'high',   '! 1 étudiant à risque critique', 'Ibrahim TOURE (ETU-2024-005) présente un risque de décrochage critique.', '/analytics'),
]

for recipient, ntype, priority, title, message, action_url in notifs:
    Notification.objects.get_or_create(
        recipient=recipient, title=title,
        defaults={
            'message': message, 'type': ntype, 'priority': priority,
            'channel': 'interne', 'action_url': action_url,
            'is_read': random.choice([True, False, False]),
            'is_sent': True, 'sent_at': timezone.now() - timedelta(days=random.randint(0,7)),
        }
    )

# Annonces institutionnelles
annonces = [
    ('📅 Calendrier des examens S5 2024-2025', 'Les examens du Semestre 5 auront lieu du 06 au 17 janvier 2025. Les salles seront affichées 48h avant. Bonne préparation à toutes et à tous.', 'etudiants'),
    ('🎓 Cérémonie de remise des diplômes', 'La cérémonie de remise des diplômes promotion 2023-2024 se tiendra le 15 mars 2025 à 10h00 à l\'Amphi A. Toutes les parties prenantes sont invitées.', 'tous'),
    ('📚 Nouveaux ouvrages disponibles en bibliothèque', 'La bibliothèque vient d\'acquérir 50 nouveaux ouvrages en informatique, IA et génie logiciel. Consultez le catalogue en ligne.', 'tous'),
    ('! Interruption système — Maintenance', 'Une maintenance est prévue le dimanche 26 janvier de 2h à 6h. La plateforme sera indisponible pendant cette période.', 'tous'),
    ('🏆 Résultats S5 publiés', 'Les résultats du Semestre 5 (session normale) sont désormais disponibles dans votre espace personnel. Délai de réclamation : 5 jours ouvrables.', 'etudiants'),
]

for i, (title, content, audience) in enumerate(annonces):
    Announcement.objects.get_or_create(
        title=title,
        defaults={
            'content': content, 'audience': audience,
            'author': admin_user if audience == 'tous' else scolarite_user,
            'is_published': True,
            'published_at': timezone.now() - timedelta(days=random.randint(1, 15)),
            'is_pinned': i < 2,
        }
    )

print(f"OK Notifications : {Notification.objects.count()} | Annonces : {Announcement.objects.count()}")

# ── 15. BIBLIOTHÈQUE ─────────────────────────────────────────────────────────
from apps.library.models import LibraryDocument, Borrowing

livres = [
    ('Clean Code', 'Robert C. Martin', 'livre', 'Génie Logiciel', 2008, 'ISBN 978-0-13-235088-4', 3),
    ('Design Patterns : GoF', 'Gang of Four', 'livre', 'Architecture Logicielle', 1994, 'ISBN 978-0-20-163361-5', 2),
    ('Deep Learning', 'Ian Goodfellow', 'livre', 'Intelligence Artificielle', 2016, 'ISBN 978-0-26-203561-3', 2),
    ('Introduction to Algorithms', 'Cormen et al.', 'livre', 'Algorithmique', 2009, 'ISBN 978-0-26-203293-3', 4),
    ('The Pragmatic Programmer', 'Hunt & Thomas', 'livre', 'Développement Logiciel', 2019, 'ISBN 978-0-13-595705-9', 3),
    ('Système Intégré de Gestion Universitaire — TIRAHOU', 'Auteur UVHM', 'memoire', 'Génie Logiciel', 2025, '', 1),
    ('Machine Learning avec Python', 'Aurélien Géron', 'livre', 'Intelligence Artificielle', 2022, 'ISBN 978-2-80-730524-7', 2),
    ('PostgreSQL Administration', 'Greg Smith', 'livre', 'Bases de Données', 2020, 'ISBN 978-1-78-951533-0', 2),
    ('React Design Patterns', 'Carlos Santana Roldán', 'livre', 'Développement Web', 2021, '', 3),
    ('Sécurité des Systèmes d\'Information', 'Solange Ghernaouti', 'livre', 'Sécurité Informatique', 2020, '', 2),
]

lib_docs = []
for title, author, ltype, domain, year_pub, isbn, qty in livres:
    doc, _ = LibraryDocument.objects.get_or_create(
        title=title, author=author,
        defaults={
            'type': ltype, 'domain': domain, 'year': year_pub, 'isbn': isbn,
            'access_level': 'authenticated', 'status': 'disponible',
            'quantity': qty, 'available_quantity': qty,
            'language': 'Français', 'download_count': random.randint(5, 120),
            'view_count': random.randint(20, 500),
            'uploaded_by': biblio_user,
            'is_featured': random.choice([True, False]),
            'rating': D(str(round(random.uniform(3.5, 5.0), 1))),
            'rating_count': random.randint(3, 25),
        }
    )
    lib_docs.append(doc)

# Emprunts actifs
from datetime import timedelta
for stu, doc_idx, days_left in [(etu1, 0, 7), (etu2, 2, -3), (etu3, 1, 14)]:
    doc = lib_docs[doc_idx]
    due = date.today() + timedelta(days=days_left)
    b, created = Borrowing.objects.get_or_create(
        document=doc, borrower=stu.user,
        defaults={'due_date': due, 'status': 'en_cours' if days_left > 0 else 'en_retard'}
    )
    if created and days_left <= 0:
        b.late_days = abs(days_left)
        b.penalty_amount = D(str(abs(days_left) * 500))
        b.save()
        doc.available_quantity = max(0, doc.available_quantity - 1)
        doc.save()

print(f"OK Bibliothque : {LibraryDocument.objects.count()} documents | {Borrowing.objects.count()} emprunts")

# ── 16. STAGES & MÉMOIRES ────────────────────────────────────────────────────
from apps.internships.models import Internship, Thesis, Defense

Internship.objects.get_or_create(
    student=etu1, academic_year=year,
    defaults={
        'supervisor': enseignant1,
        'company_name': 'Orange Mali',
        'company_address': 'Bamako, Hamdallaye ACI 2000',
        'company_supervisor': 'M. Amadou TRAORÉ',
        'company_supervisor_email': 'a.traore@orange.ml',
        'subject': 'Développement d\'une plateforme de gestion des ressources humaines avec Django REST',
        'description': 'Développement fullstack d\'une application RH intégrée.',
        'start_date': date(2025, 3, 3),
        'end_date': date(2025, 5, 30),
        'status': 'convention_signee',
    }
)

thesis, _ = Thesis.objects.get_or_create(
    student=etu3, academic_year=year,
    defaults={
        'type': 'memoire_licence',
        'title': 'Conception et développement d\'un système de détection d\'intrusion basé sur le machine learning',
        'abstract': 'Cette étude propose un système IDS utilisant des algorithmes de ML pour détecter les anomalies réseau en temps réel.',
        'keywords': 'IDS, Machine Learning, Sécurité, Réseaux, Python',
        'supervisor': enseignant1,
        'co_supervisor': enseignant2,
        'status': 'en_redaction',
        'plagiarism_score': D('4.2'),
    }
)

Defense.objects.get_or_create(
    thesis=thesis,
    defaults={
        'scheduled_date': timezone.make_aware(datetime(2025, 6, 20, 10, 0)),
        'room': 'Amphi A',
        'virtual_link': 'https://meet.jit.si/soutenance-sangare-2025',
        'status': 'planifiee',
        'jury_president': enseignant1,
    }
)

print(f"OK Stages : {Internship.objects.count()} | Mmoires : {Thesis.objects.count()} | Soutenances : {Defense.objects.count()}")

# ── 17. CLASSES VIRTUELLES ───────────────────────────────────────────────────
from apps.virtual_class.models import VirtualClassSession

for title, provider, days_offset, status in [
    ('Architecture Logicielle — Cours Synchrone S5', 'bbb',  -7, 'terminee'),
    ('TD Architecture Patterns — Groupe L3A',         'jitsi', -3, 'terminee'),
    ('Cours Web Avancé — React & TypeScript',         'zoom',   2, 'planifiee'),
    ('Soutenance Mémoire — SANGARE Moussa',           'bbb',   20, 'planifiee'),
]:
    start = timezone.now() + timedelta(days=days_offset)
    end = start + timedelta(hours=2)
    VirtualClassSession.objects.get_or_create(
        title=title, course_space=cs_archi,
        defaults={
            'provider': provider, 'mode': 'hybride',
            'scheduled_start': start, 'scheduled_end': end,
            'status': status,
            'room_capacity': 40,
            'physical_room': 'Amphi A' if status == 'planifiee' else '',
            'join_url': f'https://meet.jit.si/tirahou-{provider}-{random.randint(1000,9999)}',
            'replay_available': status == 'terminee',
            'is_recorded': status == 'terminee',
            'created_by': enseignant1,
        }
    )

print(f"OK Classes virtuelles : {VirtualClassSession.objects.count()}")

# ── RÉSUMÉ FINAL ─────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(" DONNES DE DMONSTRATION CHARGES AVEC SUCCS")
print("=" * 60)
print()
print("COMPTES DE CONNEXION :")
print()
print(f"  Super Admin      : admin@tirahou.edu          / Admin@2024")
print(f"  Scolarit        : scolarite@tirahou.edu      / Test@2024")
print(f"  Financier        : financier@tirahou.edu      / Test@2024")
print(f"  Resp. Pda.      : responsable@tirahou.edu    / Test@2024")
print(f"  Enseignant       : enseignant@tirahou.edu     / Test@2024")
print(f"  Bibliothcaire   : bibliothecaire@tirahou.edu / Test@2024")
print(f"  tudiant 1 (bon) : etudiant@tirahou.edu       / Test@2024 (moy: 14.1)")
print(f"  tudiant 2       : etudiant2@tirahou.edu      / Test@2024 (moy: 11.2)")
print(f"  tudiant 3 (top) : etudiant3@tirahou.edu      / Test@2024 (moy: 17.2)")
print(f"  tudiant 4 (risk): etudiant4@tirahou.edu      / Test@2024 (ajourn)")
print()
print("PAGES RECOMMANDES POUR CAPTURES D'CRAN :")
print()
print("  / (LandingPage)            Page d'accueil TIRAHOU")
print("  /login                     Page de connexion (design split)")
print("  /dashboard                 Tableau de bord (selon rle)")
print("  /students                  Liste tudiants avec filtres")
print("  /analytics                 Analytics + graphiques")
print("  /lms                       Campus virtuel LMS")
print("  /attendance                Gestion prsences QR code")
print("  /evaluation                Notes et dlibrations")
print("  /finance                   Gestion financire")
print("  /student/courses           Espace tudiant (connexion etudiant@)")
print("  /my-grades                 Mes notes (etudiant@)")
print("  /verify/VER-...            Vrification document (public)")
print()
print("  API Swagger : http://localhost:8000/api/docs/")
print("=" * 60)
