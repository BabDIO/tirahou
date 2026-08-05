from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import Room, ScheduledSession, Timetable
from .serializers import RoomSerializer, ScheduledSessionSerializer, TimetableSerializer
from .services import switch_session_mode, detect_room_conflicts, detect_teacher_conflicts

# Rôles habilités à administrer salles/emplois du temps/séances en dehors
# de l'enseignant assigné à la séance concernée.
SCHEDULING_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique',
)


class IsSchedulingManager(permissions.BasePermission):
    """Écriture réservée aux rôles planification/administration — la
    lecture reste ouverte à tout authentifié (étudiants/enseignants ont
    besoin de voir leur emploi du temps)."""
    def has_permission(self, request, view):
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.roles.filter(name__in=SCHEDULING_MANAGER_ROLES).exists()
        ))


def _can_manage_session(user, session):
    if user.is_superuser or user.roles.filter(name__in=SCHEDULING_MANAGER_ROLES).exists():
        return True
    return session.teacher_id == user.id


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchedulingManager]
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
        qs = ScheduledSession.objects.select_related('ec__ue', 'room', 'group')

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
        # Aucun contrôle n'existait auparavant : seuls la scolarité/la
        # planification (ou l'enseignant assigné) doivent pouvoir créer une
        # séance de cours.
        data = serializer.validated_data
        teacher = data.get('teacher')
        user = self.request.user
        is_manager = user.is_superuser or user.roles.filter(name__in=SCHEDULING_MANAGER_ROLES).exists()
        if not (is_manager or (teacher and teacher.id == user.id)):
            raise PermissionDenied("Vous ne pouvez pas planifier cette séance.")

        # Vérification de conflit de salle ET d'enseignant — seul le
        # conflit de salle était vérifié ici ; detect_teacher_conflicts
        # existe (utilisée par l'action conflicts ci-dessous) mais n'était
        # jamais appelée à la création, un même enseignant pouvait donc être
        # planifié sur deux séances qui se chevauchent.
        # select_for_update() sur la salle/l'enseignant : le test
        # "exists() puis save()" n'était protégé par aucun verrou — deux
        # créations concurrentes sur le même créneau pouvaient toutes deux
        # passer le test avant qu'aucune ne soit enregistrée (double
        # réservation). Verrouiller la ligne Room/User cible sérialise les
        # requêtes concurrentes visant la même salle/le même enseignant.
        room = data.get('room')
        with transaction.atomic():
            if room:
                room = Room.objects.select_for_update().get(pk=room.pk)
            if teacher:
                from apps.accounts.models import User
                teacher = User.objects.select_for_update().get(pk=teacher.pk)
            if room and detect_room_conflicts(data.get('ec'), data['start_datetime'], data['end_datetime'], room).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'room': 'Conflit de salle détecté.'})
            if teacher and detect_teacher_conflicts(teacher, data['start_datetime'], data['end_datetime']).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'teacher': 'Cet enseignant a déjà une séance sur ce créneau.'})
            serializer.save()

    def perform_update(self, serializer):
        # Faille confirmée en direct sur cancel() ci-dessous (même absence
        # de contrôle) : un étudiant, dont get_queryset() l'autorise à VOIR
        # les séances de son groupe, pouvait aussi les modifier/annuler
        # directement — HTTP 200 sur un vrai cours du jeu de démonstration.
        instance = serializer.instance
        if not _can_manage_session(self.request.user, instance):
            raise PermissionDenied("Vous ne gérez pas cette séance.")
        # Aucune revérification de conflit n'existait à la modification
        # (seulement à la création) : déplacer une séance (horaire/salle/
        # enseignant) pouvait donc créer un double-booking silencieux.
        data = serializer.validated_data
        start = data.get('start_datetime', instance.start_datetime)
        end = data.get('end_datetime', instance.end_datetime)
        room = data.get('room', instance.room)
        teacher = data.get('teacher', instance.teacher)
        with transaction.atomic():
            if room:
                room = Room.objects.select_for_update().get(pk=room.pk)
            if teacher:
                from apps.accounts.models import User
                teacher = User.objects.select_for_update().get(pk=teacher.pk)
            if room and detect_room_conflicts(data.get('ec', instance.ec), start, end, room, exclude_session_id=instance.id).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'room': 'Conflit de salle détecté.'})
            if teacher and detect_teacher_conflicts(teacher, start, end, exclude_session_id=instance.id).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'teacher': 'Cet enseignant a déjà une séance sur ce créneau.'})
            serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_session(self.request.user, instance):
            raise PermissionDenied("Vous ne gérez pas cette séance.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        if not _can_manage_session(request.user, session):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        session.status = 'annule'
        session.cancellation_reason = request.data.get('reason', '')
        session.save()
        return Response({'detail': 'Séance annulée.'})

    @action(detail=True, methods=['post'])
    def switch_mode(self, request, pk=None):
        """Bascule le mode d'une séance avec notification automatique (8.18)."""
        session = self.get_object()
        if not _can_manage_session(request.user, session):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
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
    permission_classes = [permissions.IsAuthenticated, IsSchedulingManager]
    filterset_fields = ['group', 'academic_year', 'is_published']

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        user = request.user
        if not (user.is_superuser or user.roles.filter(name__in=SCHEDULING_MANAGER_ROLES).exists()):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        timetable = self.get_object()
        timetable.is_published = True
        timetable.published_at = timezone.now()
        timetable.save()
        return Response({'detail': 'Emploi du temps publié.'})
