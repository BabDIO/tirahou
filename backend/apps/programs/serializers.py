from rest_framework import serializers
from .models import Program, Semester, UE, EC, Group


class ECSerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    teacher_names = serializers.SerializerMethodField()

    class Meta:
        model = EC
        fields = '__all__'

    def get_teacher_names(self, obj):
        return [t.get_full_name() for t in obj.teachers.all()]


class UESerializer(serializers.ModelSerializer):
    ecs = ECSerializer(many=True, read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = UE
        fields = '__all__'


class SemesterSerializer(serializers.ModelSerializer):
    ues = UESerializer(many=True, read_only=True)

    class Meta:
        model = Semester
        fields = '__all__'


class ProgramSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Program
        fields = '__all__'


class ProgramDetailSerializer(ProgramSerializer):
    semesters = SemesterSerializer(many=True, read_only=True)


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = '__all__'
