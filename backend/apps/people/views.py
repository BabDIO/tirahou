from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import Student, Teacher, AdminStaff
from .serializers import (
    StudentSerializer, StudentCreateSerializer,
    TeacherSerializer, TeacherCreateSerializer,
    AdminStaffSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(is_active=True).select_related('user', 'current_program').order_by('id')
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'current_program', 'current_year', 'gender']
    search_fields = ['student_id', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['student_id', 'created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Student.objects.none()
        user = self.request.user
        qs = Student.objects.filter(is_active=True).select_related('user', 'current_program')

        # Étudiant : seulement son propre profil
        if hasattr(user, 'student_profile'):
            return qs.filter(user=user)

        # Enseignant : seulement ses étudiants inscrits dans ses cours
        if hasattr(user, 'teacher_profile'):
            from apps.enrollment.models import UEEnrollment
            student_ids = UEEnrollment.objects.filter(
                ue__ecs__teachers=user
            ).values_list(
                'peda_enrollment__admin_enrollment__student_id', flat=True
            ).distinct()
            return qs.filter(id__in=student_ids)

        # Admin, scolarité, responsable : tous les étudiants
        return qs.order_by('id')

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        return StudentSerializer

    @action(detail=True, methods=['get'])
    def academic_history(self, request, pk=None):
        student = self.get_object()
        from apps.enrollment.models import AdminEnrollment
        from apps.enrollment.serializers import AdminEnrollmentSerializer
        enrollments = AdminEnrollment.objects.filter(student=student).select_related('academic_year', 'program')
        return Response(AdminEnrollmentSerializer(enrollments, many=True).data)

    @action(detail=True, methods=['get'])
    def grades(self, request, pk=None):
        student = self.get_object()
        from apps.evaluation.models import SemesterResult
        from apps.evaluation.serializers import SemesterResultSerializer
        results = SemesterResult.objects.filter(student=student, published=True)
        return Response(SemesterResultSerializer(results, many=True).data)

    @action(detail=True, methods=['get'])
    def attendance_summary(self, request, pk=None):
        """Résumé d'assiduité de l'étudiant"""
        student = self.get_object()
        from apps.attendance.models import AbsenceSummary
        from apps.attendance.serializers import AbsenceSummarySerializer
        summaries = AbsenceSummary.objects.filter(student=student).select_related('course_space')
        return Response(AbsenceSummarySerializer(summaries, many=True).data)

    @action(detail=True, methods=['get'])
    def finance_summary(self, request, pk=None):
        """Résumé financier de l'étudiant"""
        student = self.get_object()
        from apps.finance.models import Invoice
        invoices = Invoice.objects.filter(student=student)
        return Response({
            'total_invoiced': sum(float(i.total_amount) for i in invoices),
            'total_paid': sum(float(i.paid_amount) for i in invoices),
            'pending': invoices.filter(status__in=['emise', 'partiellement_payee']).count(),
            'overdue': invoices.filter(status='en_retard').count(),
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques globales des étudiants"""
        qs = Student.objects.filter(is_active=True)
        return Response({
            'total': qs.count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'by_program': list(qs.values('current_program__name').annotate(count=Count('id')).order_by('-count')[:10]),
            'by_gender': list(qs.values('gender').annotate(count=Count('id'))),
        })

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Profil de l'étudiant connecté"""
        try:
            student = request.user.student_profile
            return Response(StudentSerializer(student).data)
        except Exception:
            return Response({'error': 'Profil étudiant non trouvé.'}, status=404)


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.filter(is_active=True).select_related('user', 'department').order_by('id')
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['grade', 'status', 'department']
    search_fields = ['teacher_id', 'user__first_name', 'user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Teacher.objects.none()
        user = self.request.user
        qs = Teacher.objects.filter(is_active=True).select_related('user', 'department')
        # Enseignant : seulement son propre profil
        if hasattr(user, 'teacher_profile'):
            return qs.filter(user=user)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return TeacherCreateSerializer
        return TeacherSerializer

    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        """Cours de l'enseignant"""
        teacher = self.get_object()
        from apps.lms.models import CourseSpace
        from apps.lms.serializers import CourseSpaceSerializer
        spaces = CourseSpace.objects.filter(teachers=teacher.user, is_active=True)
        return Response(CourseSpaceSerializer(spaces, many=True).data)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Planning de l'enseignant"""
        teacher = self.get_object()
        from apps.scheduling_app.models import ScheduledSession
        from apps.scheduling_app.serializers import ScheduledSessionSerializer
        sessions = ScheduledSession.objects.filter(
            teacher=teacher,
            status__in=['planifie', 'confirme']
        ).select_related('ec', 'room').order_by('start_datetime')[:30]
        return Response(ScheduledSessionSerializer(sessions, many=True).data)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Étudiants de l'enseignant"""
        teacher = self.get_object()
        from apps.people.models import Student
        from apps.enrollment.models import UEEnrollment
        student_ids = UEEnrollment.objects.filter(
            ue__ecs__in=teacher.ecs.all()
        ).values_list('peda_enrollment__admin_enrollment__student_id', flat=True).distinct()
        students = Student.objects.filter(id__in=student_ids, is_active=True)
        return Response(StudentSerializer(students, many=True).data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Profil de l'enseignant connecté"""
        try:
            teacher = request.user.teacher_profile
            return Response(TeacherSerializer(teacher).data)
        except Exception:
            return Response({'error': 'Profil enseignant non trouvé.'}, status=404)


class AdminStaffViewSet(viewsets.ModelViewSet):
    queryset = AdminStaff.objects.filter(is_active=True).select_related('user').order_by('id')
    serializer_class = AdminStaffSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['service']
    search_fields = ['staff_id', 'user__first_name', 'user__last_name']
