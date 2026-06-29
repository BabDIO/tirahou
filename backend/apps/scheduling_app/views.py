from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import Room, ScheduledSession, Timetable
from .serializers import RoomSerializer, ScheduledSessionSerializer, TimetableSerializer
from .services import switch_session_mode, detect_room_conflicts, detect_teacher_conflicts


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'is_virtual']
    search_fields = ['name', 'code']

    @action(detail=False, methods=['get'])
    def available(self, request):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if not start or not end:
            return Response({'detail': 'Paramètres start et end requis.'}, status=status.HTTP_400_BAD_REQUEST)
        busy_rooms = ScheduledSession.objects.filter(
            start_datetime__lt=end,
            end_datetime__gt=start,
            status__in=['planifie', 'confirme'],
        ).values_list('room_id', flat=True)
        available = Room.objects.filter(is_active=True).exclude(id__in=busy_rooms)
        return Response(RoomSerializer(available, many=True).data)


class ScheduledSessionViewSet(viewsets.ModelViewSet):
    queryset = ScheduledSession.objects.all().select_related('ec', 'teacher', 'room', 'group')
    serializer_class = ScheduledSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['ec', 'teacher', 'room', 'group', 'academic_year', 'mode', 'status']
    ordering_fields = ['start_datetime']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ScheduledSession.objects.none()
        user = self.request.user
        qs = ScheduledSession.objects.select_related('ec__ue', 'teacher__user', 'room', 'group')

        # Enseignant : seulement ses séances
        if hasattr(user, 'teacher_profile'):
            return qs.filter(teacher=user)

        # Étudiant : séances de son groupe
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            from apps.enrollment.models import PedaEnrollment
            group_ids = PedaEnrollment.objects.filter(
                admin_enrollment__student=student,
                admin_enrollment__status='validee'
            ).values_list('group_id', flat=True)
            return qs.filter(group_id__in=group_ids, status__in=['planifie', 'confirme', 'realise'])

        return qs

    def perform_create(self, serializer):
        # Vérification de conflit de salle
        data = serializer.validated_data
        room = data.get('room')
        if room:
            conflict = ScheduledSession.objects.filter(
                room=room,
                start_datetime__lt=data['end_datetime'],
                end_datetime__gt=data['start_datetime'],
                status__in=['planifie', 'confirme'],
            ).exists()
            if conflict:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'room': 'Conflit de salle détecté.'})
        serializer.save()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        session.status = 'annule'
        session.cancellation_reason = request.data.get('reason', '')
        session.save()
        return Response({'detail': 'Séance annulée.'})

    @action(detail=True, methods=['post'])
    def switch_mode(self, request, pk=None):
        """Bascule le mode d'une séance avec notification automatique (8.18)."""
        session = self.get_object()
        new_mode = request.data.get('mode')
        reason = request.data.get('reason', '')
        valid_modes = ['presentiel', 'distanciel_sync', 'distanciel_async', 'hybride']
        if new_mode not in valid_modes:
            return Response({'detail': f'Mode invalide. Valeurs: {valid_modes}'}, status=status.HTTP_400_BAD_REQUEST)
        updated = switch_session_mode(session, new_mode, reason, request.user)
        return Response({'detail': f'Mode changé en {new_mode}.', 'session': ScheduledSessionSerializer(updated).data})

    @action(detail=False, methods=['get'])
    def conflicts(self, request):
        """Détecte les conflits de salle et d'enseignant."""
        room_id = request.query_params.get('room')
        teacher_id = request.query_params.get('teacher')
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        exclude = request.query_params.get('exclude')
        result = {'room_conflicts': [], 'teacher_conflicts': []}
        if room_id and start and end:
            from .models import Room as RoomModel
            try:
                room = RoomModel.objects.get(id=room_id)
                conflicts = detect_room_conflicts(None, start, end, room, exclude)
                result['room_conflicts'] = ScheduledSessionSerializer(conflicts, many=True).data
            except RoomModel.DoesNotExist:
                pass
        if teacher_id and start and end:
            from apps.accounts.models import User
            try:
                teacher = User.objects.get(id=teacher_id)
                conflicts = detect_teacher_conflicts(teacher, start, end, exclude)
                result['teacher_conflicts'] = ScheduledSessionSerializer(conflicts, many=True).data
            except User.DoesNotExist:
                pass
        return Response(result)


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all().select_related('group', 'academic_year')
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['group', 'academic_year', 'is_published']

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        timetable = self.get_object()
        timetable.is_published = True
        timetable.published_at = timezone.now()
        timetable.save()
        return Response({'detail': 'Emploi du temps publié.'})
