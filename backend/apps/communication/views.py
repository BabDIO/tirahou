from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count
from .models import Notification, Announcement, Message, Forum, ForumPost, PushSubscription
from .serializers import (
    NotificationSerializer, AnnouncementSerializer,
    MessageSerializer, ForumSerializer, ForumPostSerializer,
    PushSubscriptionSerializer,
)


# Rôles habilités à envoyer une notification manuelle à N'IMPORTE QUEL
# utilisateur (contrairement aux notifications système, qui ciblent déjà
# le bon destinataire). Sans ce contrôle, n'importe quel compte authentifié
# pouvait pousser un faux message (phishing, usurpation) à n'importe qui.
NOTIFICATION_SENDER_ROLES = [
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'responsable_pedagogique', 'chef_departement',
]


def _can_send_notification(user):
    return user.is_superuser or user.roles.filter(name__in=NOTIFICATION_SENDER_ROLES).exists()


# Announcement/Message/ForumPost.attachment n'avaient aucune limite de
# taille ni de format, contrairement aux uploads équivalents ailleurs dans
# le projet (documents d'identité, rendus LMS, rapports de stage).
MAX_ATTACHMENT_MB = 15
ALLOWED_ATTACHMENT_EXTENSIONS = ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip')


def _validate_attachment(f):
    if not f:
        return None
    if f.size > MAX_ATTACHMENT_MB * 1024 * 1024:
        return f'Pièce jointe trop volumineuse (max {MAX_ATTACHMENT_MB} Mo).'
    ext = f.name.rsplit('.', 1)[-1].lower() if '.' in f.name else ''
    if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
        return f"Format non autorisé (extensions acceptées : {', '.join(ALLOWED_ATTACHMENT_EXTENSIONS)})."
    return None


# Rôles pédagogiques/administratifs habilités à gérer les annonces et forums
# indépendamment d'en être l'auteur (mêmes rôles déjà utilisés par
# publish/pin/toggle_status). Aucun perform_update/perform_destroy n'existait
# sur Announcement/Forum/ForumPost : n'importe quel utilisateur authentifié
# pouvait modifier ou supprimer l'annonce/le post/le forum de n'importe qui
# (et même passer is_published/is_pinned/is_open directement en PATCH, en
# contournant les actions publish()/pin()/toggle_status() ci-dessous).
CONTENT_MANAGER_ROLES = [
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'responsable_pedagogique', 'chef_departement', 'enseignant',
]


def _is_content_manager(user):
    return user.is_superuser or user.roles.filter(name__in=CONTENT_MANAGER_ROLES).exists()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'is_read', 'channel']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=self.request.user).select_related('recipient')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({'detail': 'Notification marquée comme lue.'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        count = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'detail': f'{count} notification(s) marquée(s) comme lue(s).'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        count = self.get_queryset().filter(is_read=True).delete()[0]
        return Response({'detail': f'{count} notification(s) supprimée(s).'})
    
    @action(detail=False, methods=['post'])
    def send_notification(self, request):
        """AMÉLIORATION: Envoyer une notification avec priorité et métadonnées"""
        from apps.accounts.models import User

        if not _can_send_notification(request.user):
            return Response({'error': 'Permission refusée.'}, status=403)

        recipient_id = request.data.get('recipient_id')
        title = request.data.get('title')
        message = request.data.get('message')
        notif_type = request.data.get('type', 'info')
        priority = request.data.get('priority', 'normal')
        channel = request.data.get('channel', 'interne')
        action_url = request.data.get('action_url', '')
        action_label = request.data.get('action_label', '')
        icon = request.data.get('icon', '')
        color = request.data.get('color', '')
        
        if not all([recipient_id, title, message]):
            return Response({'error': 'recipient_id, title et message requis'}, status=400)
        
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Destinataire non trouvé'}, status=404)
        
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            type=notif_type,
            priority=priority,
            channel=channel,
            action_url=action_url,
            action_label=action_label,
            icon=icon,
            color=color,
            is_sent=True,
            sent_at=timezone.now()
        )
        
        return Response(NotificationSerializer(notification).data, status=201)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['audience', 'course_space', 'is_published', 'is_pinned']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'published_at', 'is_pinned']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Announcement.objects.none()
        
        user = self.request.user
        qs = Announcement.objects.select_related('author', 'course_space')
        
        # Admins et responsables voient tout, y compris les brouillons non
        # publiés — 'admin' n'existe pas parmi les 13 rôles réels du système,
        # cette vérification ne matchait donc jamais aucun compte admin réel.
        if user.is_superuser or user.roles.filter(
            name__in=['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement']
        ).exists():
            return qs.order_by('-is_pinned', '-published_at')
        
        # Autres utilisateurs voient seulement les annonces publiées
        return qs.filter(is_published=True).order_by('-is_pinned', '-published_at')

    def perform_create(self, serializer):
        error = _validate_attachment(self.request.FILES.get('attachment'))
        if error:
            raise serializers.ValidationError({'attachment': error})
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        ann = serializer.instance
        if not (_is_content_manager(self.request.user) or ann.author_id == self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas modifier cette annonce.")
        serializer.save()

    def perform_destroy(self, instance):
        if not (_is_content_manager(self.request.user) or instance.author_id == self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas supprimer cette annonce.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        ann = self.get_object()
        allowed_roles = ['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement', 'enseignant']
        if not (request.user.is_superuser or request.user.roles.filter(name__in=allowed_roles).exists()):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        ann.is_published = True
        ann.published_at = timezone.now()
        ann.save()
        return Response({'detail': 'Annonce publiée avec succès.'})

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        ann = self.get_object()
        allowed_roles = ['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement']
        if not (request.user.is_superuser or request.user.roles.filter(name__in=allowed_roles).exists()):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        ann.is_pinned = not ann.is_pinned
        ann.save()
        return Response({'detail': f'Annonce {"épinglée" if ann.is_pinned else "désépinglée"}.'})


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.none()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['subject', 'body']
    ordering_fields = ['created_at', 'is_read']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Message.objects.none()
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient').order_by('-created_at')

    def perform_create(self, serializer):
        error = _validate_attachment(self.request.FILES.get('attachment'))
        if error:
            raise serializers.ValidationError({'attachment': error})
        serializer.save(sender=self.request.user)

    def perform_update(self, serializer):
        # get_queryset() renvoie les messages où l'utilisateur est SOIT
        # sender SOIT recipient — sans ce contrôle, le destinataire pouvait
        # PATCHer subject/body/recipient d'un message qu'il n'a pas écrit
        # (aucune fonctionnalité front n'édite un message : seul mark_read,
        # qui passe par l'action dédiée ci-dessous, doit pouvoir le faire).
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Un message ne peut pas être modifié après envoi.")

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        if instance.sender_id != self.request.user.id:
            raise PermissionDenied("Seul l'expéditeur peut supprimer ce message.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        messages = Message.objects.filter(
            recipient=request.user
        ).select_related('sender', 'recipient').order_by('-created_at')
        return Response(MessageSerializer(messages, many=True).data)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        messages = Message.objects.filter(
            sender=request.user
        ).select_related('sender', 'recipient').order_by('-created_at')
        return Response(MessageSerializer(messages, many=True).data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if msg.recipient != request.user:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        msg.is_read = True
        msg.read_at = timezone.now()
        msg.save()
        return Response({'detail': 'Message marqué comme lu.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Message.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})


class ForumViewSet(viewsets.ModelViewSet):
    queryset = Forum.objects.filter(is_active=True)
    serializer_class = ForumSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'is_open']
    search_fields = ['title', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Forum.objects.none()
        return Forum.objects.filter(is_active=True).select_related('course_space').annotate(
            posts_count=Count('posts')
        )

    def perform_create(self, serializer):
        # Créer un forum est une action pédagogique/administrative
        # (voir CommunicationPage.tsx : bouton réservé à
        # isAdmin/isEnseignant/isScolarite côté frontend) — sans ce contrôle,
        # rien ne l'imposait côté API.
        if not _is_content_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas créer de forum.")
        serializer.save()

    def perform_update(self, serializer):
        if not _is_content_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas modifier ce forum.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_content_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas supprimer ce forum.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        forum = self.get_object()
        allowed_roles = ['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement', 'enseignant']
        if not (request.user.is_superuser or request.user.roles.filter(name__in=allowed_roles).exists()):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        forum.is_open = not forum.is_open
        forum.save()
        return Response({'detail': f'Forum {"ouvert" if forum.is_open else "fermé"}.'})


class ForumPostViewSet(viewsets.ModelViewSet):
    queryset = ForumPost.objects.filter(is_active=True)
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['forum', 'parent', 'is_pinned']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'is_pinned']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ForumPost.objects.none()
        return ForumPost.objects.filter(is_active=True).select_related(
            'author', 'forum', 'parent'
        ).annotate(
            replies_count=Count('replies')
        ).order_by('-is_pinned', 'created_at')

    def perform_create(self, serializer):
        forum = serializer.validated_data['forum']
        if not forum.is_open:
            raise serializers.ValidationError('Ce forum est fermé.')
        error = _validate_attachment(self.request.FILES.get('attachment'))
        if error:
            raise serializers.ValidationError({'attachment': error})
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        post = serializer.instance
        if not (_is_content_manager(self.request.user) or post.author_id == self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas modifier ce message.")
        serializer.save()

    def perform_destroy(self, instance):
        if not (_is_content_manager(self.request.user) or instance.author_id == self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas supprimer ce message.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        post = self.get_object()
        # 'admin' n'existe pas parmi les 13 rôles réels (super_admin,
        # admin_institutionnel, ...) — cette vérification ne matchait jamais
        # aucun compte administrateur réel, rendant l'épinglage inutilisable
        # pour eux. Corrigé avec les noms de rôles effectivement définis.
        allowed_roles = ['super_admin', 'admin_institutionnel', 'responsable_pedagogique', 'chef_departement', 'enseignant']
        if not (request.user.is_superuser or request.user.roles.filter(name__in=allowed_roles).exists()):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        post.is_pinned = not post.is_pinned
        post.save()
        return Response({'detail': f'Post {"épinglé" if post.is_pinned else "désépinglé"}.'})


class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """
    Abonnement/désabonnement aux notifications push web (VAPID, 8.24 / Q4).
    Le frontend crée un abonnement navigateur (PushManager.subscribe) puis
    l'enregistre ici ; `create` fait un upsert par `endpoint` pour éviter
    les doublons lors d'un réabonnement.
    """
    queryset = PushSubscription.objects.all()
    serializer_class = PushSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PushSubscription.objects.none()
        return PushSubscription.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.validated_data['endpoint']
        subscription, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': serializer.validated_data['p256dh'],
                'auth': serializer.validated_data['auth'],
                'user_agent': serializer.validated_data.get('user_agent', ''),
            },
        )
        return Response(PushSubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def unsubscribe(self, request):
        endpoint = request.data.get('endpoint')
        if not endpoint:
            return Response({'error': 'endpoint requis'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(endpoint=endpoint, user=request.user).delete()
        return Response({'detail': 'Désabonnement effectué.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vapid_public_key(request):
    """Clé publique VAPID à utiliser côté navigateur pour PushManager.subscribe()."""
    return Response({'public_key': settings.VAPID_PUBLIC_KEY})
