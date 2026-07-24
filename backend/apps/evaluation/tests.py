from decimal import Decimal

from django.test import TestCase

from apps.academic.models import University, Faculty, Department, LMDRegulation, AcademicYear
from apps.accounts.models import User
from apps.programs.models import Program, Semester, UE, EC
from apps.people.models import Student
from apps.evaluation.models import ExamSession, Grade, UEResult, SemesterResult


class LMDFixtureMixin:
    """
    Construit la chaîne LMD minimale (Université -> ... -> EC) nécessaire
    pour tester le calcul des notes/moyennes/compensation, une fois par
    classe de test (setUpTestData, transaction partagée en lecture seule
    entre les méthodes de test — pattern standard Django, plus rapide que
    recréer la chaîne à chaque test).
    """

    @classmethod
    def setUpTestData(cls):
        university = University.objects.create(name='Université Test', acronym='UT')
        cls.regulation = LMDRegulation.objects.create(
            name='Règlement Licence', cycle='licence', university=university,
            compensation_allowed=True, compensation_min_grade=Decimal('8.00'),
            passing_grade=Decimal('10.00'),
        )
        faculty = Faculty.objects.create(university=university, name='Faculté Test', acronym='FT')
        department = Department.objects.create(faculty=faculty, name='Département Test', acronym='DT')
        cls.program = Program.objects.create(
            code='INFO-L1', name='Informatique L1', type='licence',
            department=department, regulation=cls.regulation,
        )
        cls.semester = Semester.objects.create(program=cls.program, number=1, label='S1')
        cls.academic_year = AcademicYear.objects.create(
            label='2025-2026', start_date='2025-09-01', end_date='2026-07-31', is_current=True,
        )
        cls.exam_session = ExamSession.objects.create(
            semester=cls.semester, academic_year=cls.academic_year, session_type='session1',
        )

        user = User.objects.create_user(
            email='etudiant.test@tirahou.edu', username='etudiant_test',
            first_name='Etu', last_name='Diant', password='Test@2024',
        )
        cls.student = Student.objects.create(user=user, student_id='ETU-TEST-001', gender='M')

    def make_ue(self, code, credits=6, coefficient=Decimal('1.0')):
        return UE.objects.create(
            semester=self.semester, code=code, name=f'UE {code}',
            credits=credits, coefficient=coefficient,
        )

    def make_ec(self, ue, code, coefficient=Decimal('1.0'), credits=1):
        return EC.objects.create(ue=ue, code=code, name=f'EC {code}', coefficient=coefficient, credits=credits)

    def make_grade(self, ec, cc=None, exam=None, is_absent=False):
        return Grade.objects.create(
            student=self.student, ec=ec, exam_session=self.exam_session,
            cc_grade=cc, exam_grade=exam, is_absent=is_absent,
        )


class GradeCalculationTests(LMDFixtureMixin, TestCase):
    """Formule de note finale : (CC x 0.4) + (Examen x 0.6), bornée [0, 20]."""

    def test_weighted_average_default_40_60(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        grade = self.make_grade(ec, cc=Decimal('15'), exam=Decimal('12'))
        # calculate_final_grade() calcule en float (voir son implémentation) ;
        # comparaison à un Decimal littéral impossible sans assertAlmostEqual.
        self.assertAlmostEqual(grade.calculate_final_grade(), 13.2, places=2)

    def test_absent_student_gets_zero(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        grade = self.make_grade(ec, cc=Decimal('18'), exam=Decimal('16'), is_absent=True)
        self.assertEqual(grade.calculate_final_grade(), 0)

    def test_bonus_and_penalty_applied(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        grade = self.make_grade(ec, cc=Decimal('10'), exam=Decimal('10'))
        grade.bonus_points = Decimal('1')
        grade.penalty_points = Decimal('0.5')
        self.assertEqual(grade.calculate_final_grade(), Decimal('10.5'))

    def test_final_grade_clamped_to_20(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        grade = self.make_grade(ec, cc=Decimal('20'), exam=Decimal('20'))
        grade.bonus_points = Decimal('5')
        self.assertEqual(grade.calculate_final_grade(), 20)

    def test_save_recomputes_final_grade_automatically(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        grade = Grade.objects.create(
            student=self.student, ec=ec, exam_session=self.exam_session,
            cc_grade=Decimal('14'), exam_grade=Decimal('10'),
        )
        # Relire depuis la DB : le champ redevient un Decimal propre via le
        # convertisseur du DecimalField (en mémoire juste après save(), la
        # valeur posée par calculate_final_grade() est encore un float brut).
        grade.refresh_from_db()
        self.assertEqual(grade.final_grade, Decimal('11.60'))  # (14*0.4)+(10*0.6)


class UEAverageTests(LMDFixtureMixin, TestCase):
    """Moyenne d'UE pondérée par les coefficients des EC qui la composent."""

    def test_average_weighted_by_ec_coefficient(self):
        ue = self.make_ue('UE1')
        ec1 = self.make_ec(ue, 'EC1', coefficient=Decimal('2'))
        ec2 = self.make_ec(ue, 'EC2', coefficient=Decimal('1'))
        for ec, grade_value in [(ec1, Decimal('16')), (ec2, Decimal('10'))]:
            g = self.make_grade(ec, cc=grade_value, exam=grade_value)
            g.status = 'validee'
            g.save()

        result = UEResult.objects.create(student=self.student, ue=ue, exam_session=self.exam_session)
        avg = result.calculate_ue_average()
        # (16*2 + 10*1) / 3 = 14.0
        self.assertEqual(avg, Decimal('14.00'))
        self.assertEqual(result.decision, 'valide')
        self.assertEqual(result.credits_obtained, ue.credits)

    def test_ue_below_passing_grade_not_validated(self):
        ue = self.make_ue('UE1')
        ec = self.make_ec(ue, 'EC1')
        g = self.make_grade(ec, cc=Decimal('6'), exam=Decimal('7'))
        g.status = 'validee'
        g.save()

        result = UEResult.objects.create(student=self.student, ue=ue, exam_session=self.exam_session)
        result.calculate_ue_average()
        self.assertEqual(result.decision, 'ajourné')
        self.assertEqual(result.credits_obtained, 0)

    def test_no_validated_grades_returns_none(self):
        ue = self.make_ue('UE1')
        result = UEResult.objects.create(student=self.student, ue=ue, exam_session=self.exam_session)
        self.assertIsNone(result.calculate_ue_average())


class SemesterCompensationTests(LMDFixtureMixin, TestCase):
    """
    Règle de compensation LMD : une UE < 10 peut être validée par
    compensation si (a) la moyenne du semestre est globalement admise et
    (b) la moyenne de cette UE ne descend pas sous le plancher de
    compensation du règlement (8.00 dans la fixture) — sinon elle reste
    en dette.
    """

    def _ue_result_at(self, ue, average, credits):
        # Simule une UE déjà calculée par calculate_ue_average(), sans
        # dépendre du détail de son propre calcul dans ces tests.
        return UEResult.objects.create(
            student=self.student, ue=ue, exam_session=self.exam_session,
            average=average, credits_obtained=credits if average >= 10 else 0,
            decision='valide' if average >= 10 else 'ajourné',
        )

    def test_low_ue_compensated_when_semester_admitted(self):
        ue_ok = self.make_ue('UE1', credits=18)
        ue_low = self.make_ue('UE2', credits=6)
        self._ue_result_at(ue_ok, Decimal('14.00'), 18)
        self._ue_result_at(ue_low, Decimal('9.00'), 6)  # < 10 mais >= 8 (plancher)

        semester_result = SemesterResult.objects.create(
            student=self.student, semester=self.semester, exam_session=self.exam_session,
        )
        semester_result.calculate_semester_average()

        ue_low_result = UEResult.objects.get(student=self.student, ue=ue_low)
        self.assertEqual(ue_low_result.decision, 'compense')
        self.assertEqual(ue_low_result.credits_obtained, ue_low.credits)
        self.assertTrue(ue_low_result.is_capitalized)

    def test_ue_below_compensation_floor_stays_debt(self):
        ue_ok = self.make_ue('UE1', credits=18)
        ue_very_low = self.make_ue('UE2', credits=6)
        self._ue_result_at(ue_ok, Decimal('16.00'), 18)
        self._ue_result_at(ue_very_low, Decimal('5.00'), 6)  # < plancher de compensation (8.00)

        semester_result = SemesterResult.objects.create(
            student=self.student, semester=self.semester, exam_session=self.exam_session,
        )
        semester_result.calculate_semester_average()

        ue_very_low_result = UEResult.objects.get(student=self.student, ue=ue_very_low)
        self.assertEqual(ue_very_low_result.decision, 'dette')
        self.assertEqual(ue_very_low_result.credits_obtained, 0)

    def test_no_compensation_when_semester_not_admitted(self):
        ue1 = self.make_ue('UE1', credits=15)
        ue2 = self.make_ue('UE2', credits=15)
        self._ue_result_at(ue1, Decimal('8.00'), 15)
        self._ue_result_at(ue2, Decimal('9.00'), 15)
        # Moyenne semestrielle = 8.5 < 10 -> semestre non admis -> pas de compensation

        semester_result = SemesterResult.objects.create(
            student=self.student, semester=self.semester, exam_session=self.exam_session,
        )
        semester_result.calculate_semester_average()

        self.assertLess(semester_result.average, Decimal('10.00'))
        for ue in (ue1, ue2):
            result = UEResult.objects.get(student=self.student, ue=ue)
            self.assertEqual(result.decision, 'ajourné')
