from rest_framework import serializers
from .models import (
    CourseSpace, CourseModule, CourseResource, Assignment,
    AssignmentSubmission, Quiz, Question, QuestionChoice,
    QuizAttempt, StudentProgress,
)


class CourseResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = CourseResource
        fields = '__all__'


class CourseModuleSerializer(serializers.ModelSerializer):
    resources = CourseResourceSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = '__all__'


class CourseSpaceSerializer(serializers.ModelSerializer):
    ue_code = serializers.CharField(source='ue.code', read_only=True)
    ue_name = serializers.CharField(source='ue.name', read_only=True)
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)

    class Meta:
        model = CourseSpace
        fields = '__all__'


class CourseSpaceDetailSerializer(CourseSpaceSerializer):
    modules = CourseModuleSerializer(many=True, read_only=True)


class AssignmentSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Assignment
        fields = '__all__'


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class QuestionChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionChoice
        exclude = ['is_correct']  # Masquer la réponse correcte pour les étudiants


class QuestionSerializer(serializers.ModelSerializer):
    choices = QuestionChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = '__all__'


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = '__all__'


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = '__all__'


class StudentProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProgress
        fields = '__all__'
