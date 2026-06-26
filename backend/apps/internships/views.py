from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Internship, Thesis, ThesisProgress, Defense
from .serializers import InternshipSerializer, ThesisSerializer, ThesisProgressSerializer, DefenseSerializer


class InternshipViewSet(viewsets.ModelViewSet):
    queryset = Internship.objects.all().select_related('student', 'academic_year')
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'academic_year', 'student']
    search_fields = ['company_name', 'subject', 'student__student_id']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Internship.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(supervisor=user)
        return qs

    def perform_create(self, serializer):
        try:
            student = self.request.user.student_profile
            serializer.save(student=student)
        except Exception:
            serializer.save()

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        internship = self.get_object()
        internship.status = 'valide'
        internship.validated_by = request.user
        internship.validated_at = timezone.now()
        internship.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=internship.student.user.id,
            title='Stage validé',
            message=f'Votre stage chez {internship.company_name} a été validé.',
            notif_type='info',
            priority='high',
            action_url='/my-internship',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Stage validé.'})

    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        internship = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Rapport requis.'}, status=400)
        internship.report_file = file
        internship.report_submitted_at = timezone.now()
        internship.status = 'rapport_soumis'
        internship.save()
        return Response({'detail': 'Rapport soumis avec succès.'})

    @action(detail=True, methods=['post'])
    def add_evaluation(self, request, pk=None):
        internship = self.get_object()
        internship.supervisor_grade = request.data.get('grade')
        internship.supervisor_comment = request.data.get('comment', '')
        internship.status = 'evalue'
        internship.save()
        return Response({'detail': 'Évaluation enregistrée.'})


class ThesisViewSet(viewsets.ModelViewSet):
    queryset = Thesis.objects.all().select_related('student', 'supervisor')
    serializer_class = ThesisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'status', 'academic_year', 'supervisor']
    search_fields = ['title', 'student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Thesis.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(supervisor=user)
        return qs

    def perform_create(self, serializer):
        try:
            student = self.request.user.student_profile
            serializer.save(student=student)
        except Exception:
            serializer.save()

    @action(detail=True, methods=['post'])
    def validate_subject(self, request, pk=None):
        thesis = self.get_object()
        thesis.status = 'sujet_valide'
        thesis.validated_by = request.user
        thesis.validated_at = timezone.now()
        thesis.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=thesis.student.user.id,
            title='Sujet de mémoire validé',
            message=f'Votre sujet "{thesis.title}" a été validé.',
            notif_type='info',
            priority='high',
            action_url='/my-internship',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Sujet validé.'})

    @action(detail=True, methods=['post'])
    def reject_subject(self, request, pk=None):
        thesis = self.get_object()
        reason = request.data.get('reason', '')
        thesis.status = 'sujet_rejete'
        thesis.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=thesis.student.user.id,
            title='Sujet de mémoire rejeté',
            message=f'Votre sujet a été rejeté. Motif: {reason}',
            notif_type='alerte',
            priority='high',
            action_url='/my-internship',
            icon='x-circle',
            color='red'
        )
        return Response({'detail': 'Sujet rejeté.'})

    @action(detail=True, methods=['post'])
    def add_progress(self, request, pk=None):
        thesis = self.get_object()
        serializer = ThesisProgressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(thesis=thesis, logged_by=request.user)
            # Mettre à jour le % de progression
            thesis.progress_percentage = request.data.get('percentage', thesis.progress_percentage)
            thesis.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def submit_final(self, request, pk=None):
        thesis = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Fichier requis.'}, status=status.HTTP_400_BAD_REQUEST)
        thesis.final_file = file
        thesis.status = 'depose'
        thesis.submitted_at = timezone.now()
        thesis.save()
        return Response({'detail': 'Mémoire déposé avec succès.'})

    @action(detail=True, methods=['get'])
    def progress_history(self, request, pk=None):
        """Historique des avancées"""
        thesis = self.get_object()
        progresses = ThesisProgress.objects.filter(thesis=thesis).order_by('-created_at')
        return Response(ThesisProgressSerializer(progresses, many=True).data)


class DefenseViewSet(viewsets.ModelViewSet):
    queryset = Defense.objects.all().select_related('thesis')
    serializer_class = DefenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']
    ordering_fields = ['scheduled_date']

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Planifier une soutenance"""
        defense = self.get_object()
        defense.scheduled_date = request.data.get('date')
        defense.location = request.data.get('location', '')
        defense.status = 'planifiee'
        defense.save()
        # Notification à l'étudiant
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=defense.thesis.student.user.id,
            title='Soutenance planifiée',
            message=f'Votre soutenance est planifiée le {defense.scheduled_date} à {defense.location}.',
            notif_type='rappel',
            priority='urgent',
            action_url='/my-internship',
            icon='calendar',
            color='blue'
        )
        return Response({'detail': 'Soutenance planifiée.'})

    @action(detail=True, methods=['post'])
    def record_grade(self, request, pk=None):
        """Enregistrer la note de soutenance"""
        defense = self.get_object()
        defense.grade = request.data.get('grade')
        defense.mention = request.data.get('mention', '')
        defense.jury_comments = request.data.get('comments', '')
        defense.status = 'terminee'
        defense.save()
        # Mettre à jour le statut de la thèse
        defense.thesis.status = 'soutenu'
        defense.thesis.save()
        return Response({'detail': 'Note de soutenance enregistrée.'})
