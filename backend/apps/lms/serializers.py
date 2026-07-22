from rest_framework import serializers
from .models import (
    CourseSpace, CourseModule, CourseResource, Assignment,
    AssignmentSubmission, Quiz, Question, QuestionChoice,
    QuizAttempt, StudentAnswer, StudentProgress, ResourceCompletion,
)


class CourseResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = CourseResource
        fields = '__all__'
        # is_active en lecture seule : cree via multipart/form-data (upload de
        # fichier) — un BooleanField absent du formulaire est interprete par
        # DRF comme "decoche" (False) plutot que "non fourni", ce qui rendrait
        # toute ressource deposee invisible immediatement (voir meme correctif
        # sur LibraryDocumentSerializer).
        read_only_fields = ['is_active']

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return False
        return ResourceCompletion.objects.filter(student=request.user.student_profile, resource=obj).exists()


class CourseModuleSerializer(serializers.ModelSerializer):
    resources = CourseResourceSerializer(many=True, read_only=True)
    prerequisite_module_title = serializers.CharField(source='prerequisite_module.title', read_only=True, default=None)

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
    time_remaining_seconds = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = '__all__'


class StudentAnswerSerializer(serializers.ModelSerializer):
    selected_choices = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    question_type = serializers.CharField(source='question.type', read_only=True)
    question_points = serializers.DecimalField(source='question.points', read_only=True, max_digits=5, decimal_places=2)

    class Meta:
        model = StudentAnswer
        fields = ['id', 'attempt', 'question', 'question_text', 'question_type', 'question_points',
                  'selected_choices', 'text_answer', 'is_correct', 'points_earned']
        read_only_fields = ['is_correct', 'points_earned']


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    answers = StudentAnswerSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    max_grade = serializers.DecimalField(source='quiz.max_grade', read_only=True, max_digits=5, decimal_places=2)
    time_remaining_seconds = serializers.IntegerField(read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = '__all__'


class StudentProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProgress
        fields = '__all__'
