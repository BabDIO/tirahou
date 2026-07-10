from rest_framework import serializers
from .models import Notification, Announcement, Message, Forum, ForumPost, PushSubscription


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = '__all__'
        read_only_fields = ['user']


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['recipient', 'is_read', 'read_at', 'sent_at', 'is_sent']


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    audience_display = serializers.CharField(source='get_audience_display', read_only=True)
    course_space_title = serializers.CharField(source='course_space.title', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['author', 'published_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'Système'


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    sender_avatar = serializers.CharField(source='sender.avatar', read_only=True)
    recipient_avatar = serializers.CharField(source='recipient.avatar', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['sender', 'is_read', 'read_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name()

    def get_recipient_name(self, obj):
        return obj.recipient.get_full_name()


class ForumPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.CharField(source='author.avatar', read_only=True)
    replies_count = serializers.IntegerField(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = '__all__'
        read_only_fields = ['author']

    def get_author_name(self, obj):
        return obj.author.get_full_name()

    def get_replies(self, obj):
        # Limiter la récursion pour éviter les problèmes de performance
        if self.context.get('include_replies', False):
            return ForumPostSerializer(obj.replies.filter(is_active=True)[:10], many=True).data
        return []


class ForumSerializer(serializers.ModelSerializer):
    course_space_title = serializers.CharField(source='course_space.title', read_only=True)
    posts_count = serializers.IntegerField(read_only=True)
    recent_posts = serializers.SerializerMethodField()

    class Meta:
        model = Forum
        fields = '__all__'

    def get_recent_posts(self, obj):
        posts = obj.posts.filter(is_active=True).select_related('author')[:5]
        return ForumPostSerializer(posts, many=True).data
