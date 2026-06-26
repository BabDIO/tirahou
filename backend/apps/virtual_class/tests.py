from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta, date

from apps.accounts.models import User, Role
from apps.academic.models import University, Faculty, Department, AcademicYear, LMDRegulation
from apps.programs.models import Program, Semester, UE
from apps.lms.models import CourseSpace
from apps.virtual_class.models import VirtualClassSession, SessionParticipant


class VirtualClassAPITests(TestCase):
	def setUp(self):
		# users
		self.instructor = User.objects.create(email='inst@example.com', username='inst', first_name='Inst', last_name='Tutor')
		self.student = User.objects.create(email='stud@example.com', username='stud', first_name='Stud', last_name='Dent')
		# give instructor a role or is_staff
		self.instructor.is_staff = True
		self.instructor.save()

		# minimal academic/program objects
		uni = University.objects.create(name='Uni', acronym='UNI')
		fac = Faculty.objects.create(university=uni, name='Fac', acronym='FAC')
		dept = Department.objects.create(faculty=fac, name='Dept', acronym='DPT')
		ay = AcademicYear.objects.create(label='2025-2026', start_date=date(2025,9,1), end_date=date(2026,6,30), is_current=True)
		lmd = LMDRegulation.objects.create(name='Reg', cycle='licence', university=uni, effective_year=ay)
		prog = Program.objects.create(code='P1', name='Prog1', type='licence', department=dept, regulation=lmd)
		sem = Semester.objects.create(program=prog, number=1, label='S1', academic_year=ay)
		ue = UE.objects.create(semester=sem, code='UE1', name='UE 1')
		# course space
		cs = CourseSpace.objects.create(ue=ue, academic_year=ay, title='Course Space')
		cs.teachers.add(self.instructor)
		cs.enrolled_students.add() if False else None

		# create a virtual session
		self.session = VirtualClassSession.objects.create(
			course_space=cs,
			title='Test Session',
			scheduled_start=timezone.now() + timedelta(minutes=30),
			scheduled_end=timezone.now() + timedelta(minutes=90),
			join_url='https://meet.test/session/1',
			created_by=self.instructor
		)

		self.client = APIClient()

	def test_join_creates_participant(self):
		self.client.force_authenticate(self.student)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/join/')
		self.assertEqual(resp.status_code, 200)
		self.assertTrue(SessionParticipant.objects.filter(session=self.session, user=self.student).exists())

	def test_start_requires_instructor(self):
		# student cannot start
		self.client.force_authenticate(self.student)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/start/')
		self.assertIn(resp.status_code, (403, 401))

		# instructor can start
		self.client.force_authenticate(self.instructor)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/start/')
		self.assertEqual(resp.status_code, 200)
		self.session.refresh_from_db()
		self.assertEqual(self.session.status, 'en_cours')

	def test_end_requires_instructor(self):
		self.client.force_authenticate(self.student)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/end/')
		self.assertIn(resp.status_code, (403, 401))

		self.client.force_authenticate(self.instructor)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/end/')
		self.assertEqual(resp.status_code, 200)
		self.session.refresh_from_db()
		self.assertEqual(self.session.status, 'terminee')

	def test_cancel_requires_instructor(self):
		self.client.force_authenticate(self.student)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/cancel/')
		self.assertIn(resp.status_code, (403, 401))

		self.client.force_authenticate(self.instructor)
		resp = self.client.post(f'/api/v1/virtual-sessions/{self.session.id}/cancel/')
		self.assertEqual(resp.status_code, 200)
		self.session.refresh_from_db()
		self.assertEqual(self.session.status, 'annulee')

