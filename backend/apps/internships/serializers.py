from rest_framework import serializers
from .models import Internship, Thesis, ThesisProgress, Defense


class InternshipSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Internship
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class ThesisProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThesisProgress
        fields = '__all__'


class DefenseSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_name = serializers.SerializerMethodField()
    memoire_title = serializers.CharField(source='thesis.title', read_only=True)
    jury_count = serializers.SerializerMethodField()

    class Meta:
        model = Defense
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.thesis.student.user.get_full_name()

    def get_jury_count(self, obj):
        return obj.jury_members.count() + (1 if obj.jury_president else 0)


class ThesisSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress_logs = ThesisProgressSerializer(many=True, read_only=True)
    defense = DefenseSerializer(read_only=True)

    class Meta:
        model = Thesis
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()
