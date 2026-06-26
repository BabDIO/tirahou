from rest_framework import serializers
from .models import Student, Teacher, AdminStaff
from apps.accounts.serializers import UserSerializer
import uuid


class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    program_name = serializers.CharField(source='current_program.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'


class StudentCreateSerializer(serializers.ModelSerializer):
    user = serializers.UUIDField(write_only=True)

    class Meta:
        model = Student
        fields = [
            'user',
            'student_id',
            'national_id',
            'gender',
            'birth_date',
            'birth_place',
            'nationality',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',
            'current_program',
            'current_year',
            'current_level',
            'status',
            'photo',
            'baccalaureate_year',
            'baccalaureate_series',
            'baccalaureate_mention',
        ]
        extra_kwargs = {
            'student_id': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        from apps.accounts.models import User

        user_id = validated_data.pop('user')
        user = User.objects.get(id=user_id)

        if not validated_data.get('student_id'):
            validated_data['student_id'] = f"ETU-{uuid.uuid4().hex[:8].upper()}"

        return Student.objects.create(user=user, **validated_data)


class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    grade_display = serializers.CharField(source='get_grade_display', read_only=True)

    class Meta:
        model = Teacher
        fields = '__all__'


class AdminStaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    service_display = serializers.CharField(source='get_service_display', read_only=True)

    class Meta:
        model = AdminStaff
        fields = '__all__'


class TeacherCreateSerializer(serializers.ModelSerializer):
    user = serializers.UUIDField(write_only=True)

    class Meta:
        model = Teacher
        fields = [
            'user',
            'teacher_id',
            'grade',
            'status',
            'department',
            'specialities',
            'bio',
            'office',
            'weekly_hours_quota',
        ]
        extra_kwargs = {
            'teacher_id': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        from apps.accounts.models import User

        user_id = validated_data.pop('user')
        user = User.objects.get(id=user_id)

        if not validated_data.get('teacher_id'):
            validated_data['teacher_id'] = f"ENS-{uuid.uuid4().hex[:8].upper()}"

        return Teacher.objects.create(user=user, **validated_data)
