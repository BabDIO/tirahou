from rest_framework import serializers
from .models import AdminEnrollment, PedaEnrollment, UEEnrollment


class UEEnrollmentSerializer(serializers.ModelSerializer):
    ue_code = serializers.CharField(source='ue.code', read_only=True)
    ue_name = serializers.CharField(source='ue.name', read_only=True)

    class Meta:
        model = UEEnrollment
        fields = '__all__'


class PedaEnrollmentSerializer(serializers.ModelSerializer):
    ue_enrollments = UEEnrollmentSerializer(many=True, read_only=True)
    semester_label = serializers.CharField(source='semester.label', read_only=True)
    student_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    ue_count = serializers.SerializerMethodField()

    class Meta:
        model = PedaEnrollment
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.admin_enrollment.student.user.get_full_name()

    def get_group_name(self, obj):
        return obj.group.name if obj.group else None

    def get_ue_count(self, obj):
        return obj.ue_enrollments.count()


class AdminEnrollmentSerializer(serializers.ModelSerializer):
    peda_enrollments = PedaEnrollmentSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    program_name = serializers.CharField(source='program.name', read_only=True)
    previous_program_name = serializers.CharField(source='previous_program.name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = AdminEnrollment
        fields = '__all__'
        read_only_fields = ['enrollment_number']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()
