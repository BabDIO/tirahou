from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import AdminEnrollment, PedaEnrollment, UEEnrollment
from .serializers import AdminEnrollmentSerializer, PedaEnrollmentSerializer, UEEnrollmentSerializer


class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = AdminEnrollment.objects.all().select_related('student', 'program', 'academic_year').order_by('id')
    serializer_class = AdminEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'program', 'academic_year', 'type']
    search_fields = ['enrollment_number', 'student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AdminEnrollment.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        # Étudiant voit seulement ses inscriptions
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        enrollment = self.get_object()
        if not enrollment.payment_validated:
            return Response({'detail': 'Paiement non validé.'}, status=status.HTTP_400_BAD_REQUEST)
        enrollment.status = 'validee'
        enrollment.validated_by = request.user
        enrollment.validated_at = timezone.now()
        enrollment.save()
        # Mettre à jour le statut étudiant
        student = enrollment.student
        student.status = 'inscrit'
        student.current_program = enrollment.program
        student.current_year = enrollment.academic_year
        student.save()
        # Notification à l'étudiant
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=student.user.id,
            title='Inscription validée',
            message=f'Votre inscription pour {enrollment.program.name} ({enrollment.academic_year}) a été validée.',
            notif_type='inscription',
            priority='high',
            channel='both',
            action_url='/my-enrollment',
            action_label='Voir mon inscription',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Inscription validée.'})

    @action(detail=True, methods=['post'])
    def validate_payment(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.payment_validated = True
        enrollment.save()
        return Response({'detail': 'Paiement validé.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        enrollment = self.get_object()
        reason = request.data.get('reason', '')
        enrollment.status = 'rejetee'
        enrollment.save()
        # Notification
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=enrollment.student.user.id,
            title='Inscription rejetée',
            message=f'Votre inscription a été rejetée. Motif: {reason}',
            notif_type='inscription',
            priority='high',
            channel='both',
            action_url='/my-enrollment',
            icon='x-circle',
            color='red'
        )
        return Response({'detail': 'Inscription rejetée.'})

    @action(detail=False, methods=['get'])
    def my_enrollment(self, request):
        """Inscription de l'étudiant connecté"""
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'error': 'Profil étudiant requis.'}, status=400)
        enrollment = AdminEnrollment.objects.filter(
            student=student, status='validee'
        ).select_related('program', 'academic_year').order_by('-created_at').first()
        if not enrollment:
            return Response({'detail': 'Aucune inscription active.'}, status=404)
        return Response(AdminEnrollmentSerializer(enrollment).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des inscriptions"""
        from django.db.models import Count
        return Response({
            'total': AdminEnrollment.objects.count(),
            'validees': AdminEnrollment.objects.filter(status='validee').count(),
            'en_attente': AdminEnrollment.objects.filter(status='en_attente').count(),
            'rejetees': AdminEnrollment.objects.filter(status='rejetee').count(),
            'by_program': list(AdminEnrollment.objects.filter(status='validee')
                .values('program__name').annotate(count=Count('id')).order_by('-count')[:10])
        })


class PedaEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = PedaEnrollment.objects.all().select_related('admin_enrollment', 'semester').order_by('id')
    serializer_class = PedaEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'semester']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PedaEnrollment.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(admin_enrollment__student=user.student_profile)
        return qs

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        peda = self.get_object()
        peda.status = 'confirmee'
        peda.confirmed_at = timezone.now()
        peda.save()
        return Response({'detail': 'Inscription pédagogique confirmée.'})

    @action(detail=True, methods=['post'])
    def auto_enroll_ues(self, request, pk=None):
        """Inscrire automatiquement l'étudiant à toutes les UE du semestre"""
        peda = self.get_object()
        ues = peda.semester.ues.filter(is_active=True)
        created = 0
        for ue in ues:
            _, is_new = UEEnrollment.objects.get_or_create(peda_enrollment=peda, ue=ue)
            if is_new:
                created += 1
        return Response({'detail': f'{created} UE inscrites automatiquement.'})


class UEEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = UEEnrollment.objects.all().order_by('id')
    serializer_class = UEEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['peda_enrollment', 'ue']
