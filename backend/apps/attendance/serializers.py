from rest_framework import serializers
from .models import AttendanceSheet, AttendanceRecord, AbsenceSummary


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class AttendanceSheetSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, read_only=True)
    present_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSheet
        fields = '__all__'
        extra_kwargs = {'session_code': {'read_only': True}}

    def get_present_count(self, obj):
        return obj.records.filter(status='present').count()

    def get_total_count(self, obj):
        return obj.records.count()


class AbsenceSummarySerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_space_title = serializers.CharField(source='course_space.title', read_only=True)

    class Meta:
        model = AbsenceSummary
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()
