from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from .models import Notification, Announcement, Message, Forum, ForumPost
from .serializers import (
    NotificationSerializer, AnnouncementSerializer,
    MessageSerializer, ForumSerializer, ForumPostSerializer,
)


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
        
        # Admins et responsables voient tout
        if user.roles.filter(name__in=['admin', 'responsable_pedagogique']).exists():
            return qs.order_by('-is_pinned', '-published_at')
        
        # Autres utilisateurs voient seulement les annonces publiées
        return qs.filter(is_published=True).order_by('-is_pinned', '-published_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        ann = self.get_object()
        if not request.user.roles.filter(name__in=['admin', 'responsable_pedagogique', 'enseignant']).exists():
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        ann.is_published = True
        ann.published_at = timezone.now()
        ann.save()
        return Response({'detail': 'Annonce publiée avec succès.'})

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        ann = self.get_object()
        if not request.user.roles.filter(name__in=['admin', 'responsable_pedagogique']).exists():
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
        serializer.save(sender=self.request.user)

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

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        forum = self.get_object()
        if not request.user.roles.filter(name__in=['admin', 'responsable_pedagogique', 'enseignant']).exists():
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
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        post = self.get_object()
        if not request.user.roles.filter(name__in=['admin', 'responsable_pedagogique', 'enseignant']).exists():
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        post.is_pinned = not post.is_pinned
        post.save()
        return Response({'detail': f'Post {"épinglé" if post.is_pinned else "désépinglé"}.'})
