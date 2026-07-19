from rest_framework import serializers
from .models import ChatConversation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'tools_used', 'created_at']
        read_only_fields = fields


class ChatConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'messages', 'last_message']
        read_only_fields = ['id', 'title', 'created_at', 'updated_at', 'messages', 'last_message']

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return last.content[:120] if last else ''
