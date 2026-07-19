from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .claude_service import send_message, ChatbotError
from .models import ChatConversation, ChatMessage
from .serializers import ChatConversationSerializer, ChatMessageSerializer

MAX_MESSAGE_LENGTH = 4000


class ChatConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ChatConversation.objects.none()
        return ChatConversation.objects.filter(user=self.request.user).prefetch_related('messages')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def messages(self, request, pk=None):
        """Envoie un message utilisateur et retourne la réponse de l'assistant."""
        conversation = self.get_object()
        text = (request.data.get('content') or '').strip()
        if not text:
            return Response({'error': 'content requis'}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > MAX_MESSAGE_LENGTH:
            return Response(
                {'error': f"Message trop long ({MAX_MESSAGE_LENGTH} caractères max)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = list(conversation.messages.order_by('created_at').values('role', 'content'))
        user_message = ChatMessage.objects.create(conversation=conversation, role='user', content=text)

        if not conversation.title:
            conversation.title = text[:60]
            conversation.save(update_fields=['title', 'updated_at'])

        try:
            reply_text, tools_used = send_message(request.user, history, text)
        except ChatbotError as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        assistant_message = ChatMessage.objects.create(
            conversation=conversation, role='assistant', content=reply_text, tools_used=tools_used,
        )
        conversation.save(update_fields=['updated_at'])

        return Response({
            'user_message': ChatMessageSerializer(user_message).data,
            'assistant_message': ChatMessageSerializer(assistant_message).data,
        }, status=status.HTTP_201_CREATED)
