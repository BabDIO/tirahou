from rest_framework import serializers
from .models import ExamSession, Grade, UEResult, SemesterResult, Jury, GradeContest


class ExamSessionSerializer(serializers.ModelSerializer):
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)

    class Meta:
        model = ExamSession
        fields = '__all__'


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    ec_code = serializers.CharField(source='ec.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Grade
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class UEResultSerializer(serializers.ModelSerializer):
    ue_code = serializers.CharField(source='ue.code', read_only=True)
    ue_name = serializers.CharField(source='ue.name', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = UEResult
        fields = '__all__'


class SemesterResultSerializer(serializers.ModelSerializer):
    semester_label = serializers.CharField(source='semester.label', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    ue_results = UEResultSerializer(many=True, read_only=True, source='student.ue_results')

    class Meta:
        model = SemesterResult
        fields = '__all__'


class JurySerializer(serializers.ModelSerializer):
    class Meta:
        model = Jury
        fields = '__all__'


class GradeContestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = GradeContest
        fields = '__all__'
