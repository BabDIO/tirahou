from rest_framework import serializers
from .models import Room, ScheduledSession, Timetable


class RoomSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Room
        fields = '__all__'


class ScheduledSessionSerializer(serializers.ModelSerializer):
    ec_code = serializers.CharField(source='ec.code', read_only=True)
    ec_name = serializers.CharField(source='ec.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ScheduledSession
        fields = '__all__'

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() if obj.teacher else ''


class TimetableSerializer(serializers.ModelSerializer):
    sessions = ScheduledSessionSerializer(many=True, read_only=True)

    class Meta:
        model = Timetable
        fields = '__all__'
