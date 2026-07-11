from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import Student, Teacher, AdminStaff, ParentGuardian, TeacherAvailability
from .serializers import (
    StudentSerializer, StudentCreateSerializer,
    TeacherSerializer, TeacherCreateSerializer,
    AdminStaffSerializer, AdminStaffCreateSerializer,
    ParentGuardianSerializer, ParentGuardianCreateSerializer, ParentGuardianBulkNotifySerializer,
    TeacherAvailabilitySerializer,
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


class TeacherAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = TeacherAvailability.objects.all().select_related('teacher')
    serializer_class = TeacherAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['teacher', 'day_of_week']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TeacherAvailability.objects.none()
        user = self.request.user
        qs = TeacherAvailability.objects.select_related('teacher__user')
        if hasattr(user, 'teacher_profile'):
            return qs.filter(teacher=user.teacher_profile)
        return qs


class AdminStaffViewSet(viewsets.ModelViewSet):
    queryset = AdminStaff.objects.filter(is_active=True).select_related('user').order_by('id')
    serializer_class = AdminStaffSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['service']
    search_fields = ['staff_id', 'user__first_name', 'user__last_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminStaffCreateSerializer
        return AdminStaffSerializer


class ParentGuardianViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des parents/tuteurs"""
    queryset = ParentGuardian.objects.filter(is_active=True).select_related('student', 'student__user').order_by('-is_primary_contact', 'last_name')
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'relationship', 'is_primary_contact', 'is_emergency_contact', 'can_receive_notifications']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'student__student_id', 'student__user__first_name', 'student__user__last_name']
    ordering_fields = ['last_name', 'first_name', 'created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ParentGuardianCreateSerializer
        elif self.action == 'bulk_notify':
            return ParentGuardianBulkNotifySerializer
        return ParentGuardianSerializer
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ParentGuardian.objects.none()
        
        user = self.request.user
        qs = super().get_queryset()
        
        # Étudiant : voir ses propres parents
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        
        # Admin scolarité, direction : voir tous
        if user.has_role(['admin_scolarite', 'admin_institutionnel', 'super_admin']):
            return qs
        
        return qs.none()
    
    @action(detail=False, methods=['get'], url_path='by-student/(?P<student_id>[^/.]+)')
    def by_student(self, request, student_id=None):
        """Récupérer les parents d'un étudiant"""
        parents = self.get_queryset().filter(student__student_id=student_id)
        serializer = self.get_serializer(parents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_notify(self, request):
        """Envoyer des notifications en masse aux parents"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        notification_type = data['notification_type']
        message = data['message']
        student_ids = data.get('student_ids', [])
        send_email = data.get('send_email', True)
        send_sms = data.get('send_sms', False)
        
        # Filtrer les parents
        queryset = self.get_queryset()
        if student_ids:
            queryset = queryset.filter(student__uuid__in=student_ids)
        
        # Filtrer par préférences de notification
        eligible_parents = [
            parent for parent in queryset
            if parent.can_receive_notification_type(notification_type)
        ]

        from django.core.mail import send_mail
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)

        sent_count = 0
        for parent in eligible_parents:
            sent_this_parent = False
            if send_email and parent.email:
                try:
                    send_mail(
                        subject=f"[TIRAHOU] {notification_type}",
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[parent.email],
                        fail_silently=False,
                    )
                    sent_this_parent = True
                except Exception as e:
                    logger.error(f"Email non envoyé à {parent.email}: {e}")
            if send_sms and parent.phone:
                try:
                    from apps.communication.sms import send_sms as send_sms_message
                    send_sms_message(parent.phone, message[:300])
                    sent_this_parent = True
                except Exception as e:
                    logger.warning(f"SMS non envoyé à {parent.phone}: {e}")
            if sent_this_parent:
                sent_count += 1

        return Response({
            'success': True,
            'message': f'{sent_count} notification(s) envoyée(s) sur {len(eligible_parents)} destinataire(s) éligible(s)',
            'recipients_count': len(eligible_parents),
            'sent_count': sent_count,
        })
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """Définir ce parent comme contact prioritaire"""
        parent = self.get_object()
        
        # Retirer primary des autres parents du même étudiant
        ParentGuardian.objects.filter(
            student=parent.student
        ).exclude(id=parent.id).update(is_primary_contact=False)
        
        parent.is_primary_contact = True
        parent.save()
        
        serializer = self.get_serializer(parent)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_preferences(self, request, pk=None):
        """Mettre à jour les préférences de notification"""
        parent = self.get_object()
        
        preferences = request.data.get('notification_preferences', {})
        can_receive = request.data.get('can_receive_notifications')
        
        if can_receive is not None:
            parent.can_receive_notifications = can_receive
        
        if preferences:
            parent.notification_preferences = preferences
        
        parent.save()
        
        serializer = self.get_serializer(parent)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_dashboard(request):
    """Tableau de bord étudiant — toutes les valeurs sont calculées depuis la base."""
    if not hasattr(request.user, 'student_profile'):
        return Response({'detail': "Profil étudiant introuvable."}, status=404)
    student = request.user.student_profile

    from apps.evaluation.models import SemesterResult
    from apps.attendance.models import AttendanceRecord

    courses_count = student.course_spaces.count()

    latest_result = SemesterResult.objects.filter(student=student, published=True).order_by('-published_at').first()
    average = float(latest_result.average) if latest_result and latest_result.average is not None else 0
    credits = latest_result.credits_obtained if latest_result else 0
    total_credits = latest_result.total_credits if latest_result else 0

    records = AttendanceRecord.objects.filter(student=student)
    total_records = records.count()
    present_records = records.filter(status__in=['present', 'retard']).count()
    attendance_rate = round((present_records / total_records) * 100, 1) if total_records else 0

    return Response({
        'courses_count': courses_count,
        'average': average,
        'credits': credits,
        'total_credits': total_credits,
        'attendance_rate': attendance_rate,
    })
