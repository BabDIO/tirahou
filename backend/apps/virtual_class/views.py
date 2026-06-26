from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import VirtualClassSession, SessionParticipant
from .serializers import VirtualClassSessionSerializer, SessionParticipantSerializer
from .permissions import IsInstructorOrStaff


class VirtualClassSessionViewSet(viewsets.ModelViewSet):
    queryset = VirtualClassSession.objects.all().select_related('course_space')
    serializer_class = VirtualClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'status', 'mode', 'provider']
    ordering_fields = ['scheduled_start']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsInstructorOrStaff])
    def start(self, request, pk=None):
        session = self.get_object()
        session.status = 'en_cours'
        session.actual_start = timezone.now()
        session.save()
        return Response({'detail': 'Session démarrée.', 'join_url': session.join_url})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsInstructorOrStaff])
    def end(self, request, pk=None):
        session = self.get_object()
        session.status = 'terminee'
        session.actual_end = timezone.now()
        session.save()
        return Response({'detail': 'Session terminée.'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsInstructorOrStaff])
    def cancel(self, request, pk=None):
        session = self.get_object()
        session.status = 'annulee'
        session.save()
        return Response({'detail': 'Session annulée.'})

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        if session.status not in ['planifiee', 'en_cours']:
            return Response({'detail': 'Session non disponible.'}, status=status.HTTP_400_BAD_REQUEST)
        join_mode = request.data.get('join_mode', 'online')
        participant, created = SessionParticipant.objects.get_or_create(
            session=session, user=request.user,
            defaults={'role': 'participant', 'join_mode': join_mode}
        )
        participant.joined_at = timezone.now()
        participant.is_present = True
        participant.join_mode = join_mode
        participant.save()
        # Enregistrer dans les présences si la session a un EC
        if session.course_space:
            try:
                from apps.people.models import Student
                student = request.user.student_profile
                from apps.analytics_app.models import LearningActivity
                LearningActivity.objects.create(
                    student=student,
                    course_space=session.course_space,
                    action='classe_virtuelle',
                    duration_seconds=0,
                    device_type=request.data.get('device', 'web')
                )
            except Exception:
                pass
        return Response({
            'detail': 'Rejoint la session.',
            'join_url': session.join_url,
            'session_id': str(session.id),
        })

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Quitter une session et enregistrer la durée"""
        session = self.get_object()
        try:
            participant = SessionParticipant.objects.get(session=session, user=request.user)
            if participant.joined_at:
                duration = (timezone.now() - participant.joined_at).seconds
                participant.duration_seconds = duration
            participant.left_at = timezone.now()
            participant.save()
        except SessionParticipant.DoesNotExist:
            pass
        return Response({'detail': 'Session quittée.'})

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Sessions à venir pour l'utilisateur connecté"""
        from django.utils import timezone as tz
        sessions = self.get_queryset().filter(
            scheduled_start__gte=tz.now(),
            status='planifiee'
        ).order_by('scheduled_start')[:10]
        return Response(VirtualClassSessionSerializer(sessions, many=True).data)

    @action(detail=False, methods=['get'])
    def my_sessions(self, request):
        """Sessions de l'utilisateur (enseignant ou étudiant)"""
        user = request.user
        if hasattr(user, 'teacher_profile'):
            sessions = self.get_queryset().filter(created_by=user)
        elif hasattr(user, 'student_profile'):
            student = user.student_profile
            enrolled_spaces = []
            try:
                from apps.enrollment.models import UEEnrollment
                enrolled_spaces = list(UEEnrollment.objects.filter(
                    peda_enrollment__admin_enrollment__student=student
                ).values_list('ue__course_spaces', flat=True))
            except Exception:
                pass
            sessions = self.get_queryset().filter(course_space__in=enrolled_spaces)
        else:
            sessions = self.get_queryset()
        return Response(VirtualClassSessionSerializer(sessions.order_by('-scheduled_start')[:20], many=True).data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Statistiques d'une session"""
        session = self.get_object()
        participants = session.participants.all()
        return Response({
            'total_invited': participants.count(),
            'total_present': participants.filter(is_present=True).count(),
            'online': participants.filter(join_mode='online', is_present=True).count(),
            'onsite': participants.filter(join_mode='onsite', is_present=True).count(),
            'avg_duration': participants.filter(
                duration_seconds__gt=0
            ).aggregate(avg=__import__('django.db.models', fromlist=['Avg']).Avg('duration_seconds'))['avg'] or 0,
        })

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Liste des participants d'une session."""
        session = self.get_object()
        qs = session.participants.select_related('user').all()
        serializer = SessionParticipantSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='participants/presence')
    def set_participant_presence(self, request, pk=None):
        """Met à jour la présence d'un participant. Body: {user_id, present: bool}"""
        session = self.get_object()
        user_id = request.data.get('user_id')
        present = request.data.get('present')
        if user_id is None or present is None:
            return Response({'detail': 'user_id et present requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            participant = SessionParticipant.objects.get(session=session, user_id=user_id)
        except SessionParticipant.DoesNotExist:
            return Response({'detail': 'Participant introuvable'}, status=status.HTTP_404_NOT_FOUND)
        participant.is_present = bool(present)
        if participant.is_present and not participant.joined_at:
            participant.joined_at = timezone.now()
        participant.save()
        return Response({'detail': 'Présence mise à jour.'})
