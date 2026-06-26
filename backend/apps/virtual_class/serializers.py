from rest_framework import serializers
from .models import VirtualClassSession, SessionParticipant


class SessionParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = SessionParticipant
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.get_full_name()


class VirtualClassSessionSerializer(serializers.ModelSerializer):
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    course_space_title = serializers.CharField(source='course_space.title', read_only=True)
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = VirtualClassSession
        fields = '__all__'
        extra_kwargs = {'moderator_password': {'write_only': True}}

    def get_participants_count(self, obj):
        return obj.participants.filter(is_present=True).count()
