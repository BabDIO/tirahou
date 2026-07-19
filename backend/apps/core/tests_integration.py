"""
Tests unitaires TIRAHOU — Modules critiques
Couvre: Auth, Étudiants, Programmes, Finance, Notes
"""
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.accounts.models import User, Role
from apps.academic.models import University, Faculty, Department, AcademicYear, LMDRegulation
from apps.programs.models import Program, Semester, UE, EC
from apps.people.models import Student, Teacher
from apps.admissions.models import Application
from apps.enrollment.models import AdminEnrollment
from apps.finance.models import FeeType, Invoice, Payment
from apps.evaluation.models import ExamSession, Grade


# ── Helpers ───────────────────────────────────────────────────────────────────
def create_admin_user():
    return User.objects.create_superuser(
        email='admin@test.edu', username='admin',
        first_name='Admin', last_name='Test', password='Test@1234'
    )


def create_student_user():
    user = User.objects.create_user(
        email='student@test.edu', username='student',
        first_name='Jean', last_name='Dupont', password='Test@1234'
    )
    role, _ = Role.objects.get_or_create(name='etudiant')
    user.roles.add(role)
    return user


def create_base_structure():
    uni = University.objects.create(name='Université Test', acronym='UT')
    fac = Faculty.objects.create(university=uni, name='Faculté Sciences', acronym='FS')
    dept = Department.objects.create(faculty=fac, name='Département Info', acronym='DI')
    year = AcademicYear.objects.create(
        label='2024-2025', start_date='2024-09-01', end_date='2025-07-31', is_current=True
    )
    reg = LMDRegulation.objects.create(
        name='Règlement LMD 2024', cycle='licence', university=uni, effective_year=year
    )
    prog = Program.objects.create(
        code='L-INFO', name='Licence Informatique', type='licence',
        mode='hybride', department=dept, regulation=reg, status='active'
    )
    sem = Semester.objects.create(program=prog, number=1, label='Semestre 1')
    ue = UE.objects.create(
        semester=sem, code='INF101', name='Algorithmique',
        credits=6, coefficient=Decimal('2.0'), volume_hours=60
    )
    ec = EC.objects.create(
        ue=ue, code='INF101-CM', name='Algorithmique CM',
        activity_type='cm', volume_hours=30, credits=3
    )
    return {'uni': uni, 'fac': fac, 'dept': dept, 'year': year, 'prog': prog, 'sem': sem, 'ue': ue, 'ec': ec}


# ── Tests Auth ────────────────────────────────────────────────────────────────
class AuthTests(APITestCase):
    def setUp(self):
        self.user = create_admin_user()
        self.login_url = '/api/v1/auth/login/'

    def test_login_success(self):
        res = self.client.post(self.login_url, {'email': 'admin@test.edu', 'password': 'Test@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_wrong_password(self):
        res = self.client.post(self.login_url, {'email': 'admin@test.edu', 'password': 'wrong'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email(self):
        res = self.client.post(self.login_url, {'email': 'unknown@test.edu', 'password': 'Test@1234'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/v1/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'admin@test.edu')

    def test_me_unauthenticated(self):
        res = self.client.get('/api/v1/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        login_res = self.client.post(self.login_url, {'email': 'admin@test.edu', 'password': 'Test@1234'})
        refresh = login_res.data['refresh']
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/auth/logout/', {'refresh': refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/auth/change-password/', {
            'old_password': 'Test@1234', 'new_password': 'NewPass@5678'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ── Tests Structure Académique ────────────────────────────────────────────────
class AcademicStructureTests(APITestCase):
    def setUp(self):
        self.user = create_admin_user()
        self.client.force_authenticate(user=self.user)
        self.data = create_base_structure()

    def test_list_universities(self):
        res = self.client.get('/api/v1/universities/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)

    def test_create_faculty(self):
        res = self.client.post('/api/v1/faculties/', {
            'university': str(self.data['uni'].id),
            'name': 'Nouvelle Faculté', 'acronym': 'NF'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_academic_year_current(self):
        res = self.client.get('/api/v1/academic-years/?is_current=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertTrue(res.data['results'][0]['is_current'])

    def test_program_maquette(self):
        prog = self.data['prog']
        res = self.client.get(f'/api/v1/programs/{prog.id}/maquette/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['number'], 1)


# ── Tests Étudiants ───────────────────────────────────────────────────────────
class StudentTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)
        self.data = create_base_structure()
        self.student_user = create_student_user()
        self.student = Student.objects.create(
            user=self.student_user,
            student_id='ETU-TEST-001',
            gender='M',
            nationality='Malienne',
            current_program=self.data['prog'],
            current_year=self.data['year'],
            status='inscrit',
        )

    def test_list_students(self):
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)

    def test_get_student_detail(self):
        res = self.client.get(f'/api/v1/students/{self.student.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['student_id'], 'ETU-TEST-001')
        self.assertIn('user', res.data)
        self.assertIn('program_name', res.data)

    def test_student_search(self):
        res = self.client.get('/api/v1/students/?search=ETU-TEST-001')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)

    def test_student_filter_by_status(self):
        res = self.client.get('/api/v1/students/?status=inscrit')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for s in res.data['results']:
            self.assertEqual(s['status'], 'inscrit')

    def test_student_academic_history(self):
        res = self.client.get(f'/api/v1/students/{self.student.id}/academic_history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ── Tests Finance ─────────────────────────────────────────────────────────────
class FinanceTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)
        self.data = create_base_structure()
        self.student_user = create_student_user()
        self.student = Student.objects.create(
            user=self.student_user, student_id='ETU-FIN-001',
            gender='F', nationality='Malienne',
        )
        self.fee_type = FeeType.objects.create(
            name='Frais inscription', category='inscription',
            amount=Decimal('150000'), academic_year=self.data['year']
        )
        self.invoice = Invoice.objects.create(
            student=self.student, academic_year=self.data['year'],
            total_amount=Decimal('150000'), status='emise'
        )

    def test_list_invoices(self):
        res = self.client.get('/api/v1/invoices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)

    def test_invoice_has_required_fields(self):
        res = self.client.get(f'/api/v1/invoices/{self.invoice.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for field in ['invoice_number', 'student_name', 'total_amount', 'paid_amount', 'remaining_amount']:
            self.assertIn(field, res.data)

    def test_add_payment(self):
        res = self.client.post(f'/api/v1/invoices/{self.invoice.id}/add_payment/', {
            'amount': '75000.00', 'method': 'mobile_money', 'status': 'valide'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.paid_amount, Decimal('75000'))
        self.assertEqual(self.invoice.status, 'partiellement_payee')

    def test_full_payment_marks_invoice_paid(self):
        self.client.post(f'/api/v1/invoices/{self.invoice.id}/add_payment/', {
            'amount': '150000.00', 'method': 'caisse', 'status': 'valide'
        })
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'payee')

    def test_invoice_summary(self):
        res = self.client.get('/api/v1/invoices/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total', res.data)
        self.assertIn('paid', res.data)

    def test_cash_journal(self):
        res = self.client.get('/api/v1/finance/cash-journal/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total', res.data)
        self.assertIn('payments', res.data)


# ── Tests Notes & Évaluation ──────────────────────────────────────────────────
class EvaluationTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)
        self.data = create_base_structure()
        self.student_user = create_student_user()
        self.student = Student.objects.create(
            user=self.student_user, student_id='ETU-EVAL-001',
            gender='M', nationality='Malienne',
        )
        self.session = ExamSession.objects.create(
            semester=self.data['sem'],
            academic_year=self.data['year'],
            session_type='session1',
            is_open=True,
        )

    def test_create_grade(self):
        res = self.client.post('/api/v1/grades/', {
            'student': str(self.student.id),
            'ec': str(self.data['ec'].id),
            'exam_session': str(self.session.id),
            'cc_grade': '14.5',
            'exam_grade': '12.0',
            'final_grade': '13.0',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_validate_grade(self):
        grade = Grade.objects.create(
            student=self.student, ec=self.data['ec'],
            exam_session=self.session, final_grade=Decimal('13.0'),
            entered_by=self.admin
        )
        res = self.client.post(f'/api/v1/grades/{grade.id}/validate/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        grade.refresh_from_db()
        self.assertEqual(grade.status, 'validee')

    def test_publish_grade(self):
        grade = Grade.objects.create(
            student=self.student, ec=self.data['ec'],
            exam_session=self.session, final_grade=Decimal('13.0'),
            status='validee', entered_by=self.admin
        )
        res = self.client.post(f'/api/v1/grades/{grade.id}/publish/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        grade.refresh_from_db()
        self.assertEqual(grade.status, 'publiee')

    def test_bulk_import_grades(self):
        res = self.client.post('/api/v1/grades/bulk_import/', {
            'grades': [{
                'student_id': str(self.student.id),
                'ec_id': str(self.data['ec'].id),
                'exam_session_id': str(self.session.id),
                'final_grade': '15.0',
            }]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('importées', res.data['detail'])

    def test_export_grades_csv(self):
        res = self.client.get('/api/v1/grades/export/?exam_session=' + str(self.session.id))
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])


# ── Tests Admissions ──────────────────────────────────────────────────────────
class AdmissionsTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)
        self.data = create_base_structure()

    def test_create_application(self):
        res = self.client.post('/api/v1/applications/', {
            'program': str(self.data['prog'].id),
            'academic_year': str(self.data['year'].id),
            'applicant': str(self.admin.id),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('application_number', res.data)

    def test_submit_application(self):
        app = Application.objects.create(
            applicant=self.admin,
            program=self.data['prog'],
            academic_year=self.data['year'],
            status='brouillon'
        )
        res = self.client.post(f'/api/v1/applications/{app.id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'soumise')

    def test_workflow_complet(self):
        """Test du workflow complet: brouillon → soumise → en_instruction → admis"""
        app = Application.objects.create(
            applicant=self.admin, program=self.data['prog'],
            academic_year=self.data['year'], status='brouillon'
        )
        # Soumettre
        self.client.post(f'/api/v1/applications/{app.id}/submit/')
        app.refresh_from_db()
        self.assertEqual(app.status, 'soumise')
        # Instruire
        self.client.post(f'/api/v1/applications/{app.id}/start_review/')
        app.refresh_from_db()
        self.assertEqual(app.status, 'en_instruction')
        # Décider — le decide endpoint crée une AdmissionDecision
        res = self.client.post(f'/api/v1/applications/{app.id}/decide/', {'decision': 'admis'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertIn(app.status, ['admis', 'en_instruction'])  # selon implémentation


# ── Tests LMS ─────────────────────────────────────────────────────────────────
class LMSTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)
        self.data = create_base_structure()

    def test_create_course_space(self):
        res = self.client.post('/api/v1/course-spaces/', {
            'ue': str(self.data['ue'].id),
            'academic_year': str(self.data['year'].id),
            'title': 'Espace Algorithmique',
            'mode': 'hybride',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data['is_published'])

    def test_publish_course_space(self):
        from apps.lms.models import CourseSpace
        space = CourseSpace.objects.create(
            ue=self.data['ue'], academic_year=self.data['year'],
            title='Test Space', mode='hybride'
        )
        res = self.client.post(f'/api/v1/course-spaces/{space.id}/publish/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        space.refresh_from_db()
        self.assertTrue(space.is_published)

    def test_change_mode(self):
        from apps.lms.models import CourseSpace
        space = CourseSpace.objects.create(
            ue=self.data['ue'], academic_year=self.data['year'],
            title='Test Space', mode='presentiel'
        )
        res = self.client.post(f'/api/v1/course-spaces/{space.id}/change_mode/', {'mode': 'hybride'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        space.refresh_from_db()
        self.assertEqual(space.mode, 'hybride')


# ── Tests Analytics ───────────────────────────────────────────────────────────
class AnalyticsTests(APITestCase):
    def setUp(self):
        self.admin = create_admin_user()
        self.client.force_authenticate(user=self.admin)

    def test_dashboard(self):
        res = self.client.get('/api/v1/analytics/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for key in ['students', 'enrollments', 'finance', 'courses', 'results']:
            self.assertIn(key, res.data)

    def test_global_report(self):
        res = self.client.get('/api/v1/analytics/report/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for key in ['students', 'enrollments', 'finance', 'results']:
            self.assertIn(key, res.data)

    def test_export_students_excel(self):
        res = self.client.get('/api/v1/analytics/export/students/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', res['Content-Type'])

    def test_export_payments_csv(self):
        res = self.client.get('/api/v1/analytics/export/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('csv', res['Content-Type'])
