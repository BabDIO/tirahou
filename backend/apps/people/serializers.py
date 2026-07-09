from rest_framework import serializers
from .models import Student, Teacher, AdminStaff, ParentGuardian
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


class ParentGuardianSerializer(serializers.ModelSerializer):
    """Serializer pour les parents/tuteurs"""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)
    full_name = serializers.SerializerMethodField()
    notification_types = serializers.SerializerMethodField()
    
    class Meta:
        model = ParentGuardian
        fields = [
            'id', 'uuid', 'student', 'student_name', 'student_id',
            'relationship', 'relationship_display',
            'first_name', 'last_name', 'full_name',
            'email', 'phone', 'phone_secondary',
            'address', 'city', 'country',
            'profession', 'employer',
            'can_receive_notifications', 'notification_preferences', 'notification_types',
            'is_primary_contact', 'is_emergency_contact',
            'has_legal_authority', 'id_card_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_notification_types(self, obj):
        return obj.get_notification_types()


class ParentGuardianCreateSerializer(serializers.ModelSerializer):
    """Serializer pour création de parents/tuteurs"""
    class Meta:
        model = ParentGuardian
        fields = [
            'student', 'relationship',
            'first_name', 'last_name',
            'email', 'phone', 'phone_secondary',
            'address', 'city', 'country',
            'profession', 'employer',
            'can_receive_notifications', 'notification_preferences',
            'is_primary_contact', 'is_emergency_contact',
            'has_legal_authority', 'id_card_number'
        ]
    
    def validate(self, data):
        # Si is_primary_contact=True, mettre les autres à False pour ce student
        if data.get('is_primary_contact'):
            student = data.get('student')
            if self.instance:  # Update
                ParentGuardian.objects.filter(
                    student=student
                ).exclude(id=self.instance.id).update(is_primary_contact=False)
            else:  # Create
                ParentGuardian.objects.filter(student=student).update(is_primary_contact=False)
        
        return data


class ParentGuardianBulkNotifySerializer(serializers.Serializer):
    """Serializer pour notifications en masse aux parents"""
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="Liste des IDs étudiants (si vide, tous les parents)"
    )
    notification_type = serializers.ChoiceField(choices=[
        ('absences', 'Absences'),
        ('notes', 'Notes'),
        ('paiements', 'Paiements'),
        ('discipline', 'Discipline'),
        ('annonces', 'Annonces'),
        ('resultats', 'Résultats')
    ])
    message = serializers.CharField(max_length=1000)
    send_email = serializers.BooleanField(default=True)
    send_sms = serializers.BooleanField(default=False)
