from rest_framework import serializers
from .models import ExamSession, Grade, UEResult, SemesterResult, Jury, GradeContest, ExamRoomAssignment


class ExamSessionSerializer(serializers.ModelSerializer):
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)

    class Meta:
        model = ExamSession
        fields = '__all__'


class ExamRoomAssignmentSerializer(serializers.ModelSerializer):
    ec_code = serializers.CharField(source='ec.code', read_only=True)
    ec_name = serializers.CharField(source='ec.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    invigilator_names = serializers.SerializerMethodField()

    class Meta:
        model = ExamRoomAssignment
        fields = '__all__'

    def get_invigilator_names(self, obj):
        return [u.get_full_name() for u in obj.invigilators.all()]


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    ec_code = serializers.CharField(source='ec.code', read_only=True)
    ec_name = serializers.CharField(source='ec.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()

    def get_entered_by_name(self, obj):
        return obj.entered_by.get_full_name() if obj.entered_by else None


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
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = SemesterResult
        fields = '__all__'


class JurySerializer(serializers.ModelSerializer):
    president_name = serializers.SerializerMethodField()
    member_names = serializers.SerializerMethodField()
    exam_session_label = serializers.SerializerMethodField()

    class Meta:
        model = Jury
        fields = '__all__'

    def get_president_name(self, obj):
        return obj.president.get_full_name() if obj.president else None

    def get_member_names(self, obj):
        return [m.get_full_name() for m in obj.members.all()]

    def get_exam_session_label(self, obj):
        return str(obj.exam_session)


class GradeContestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = GradeContest
        fields = '__all__'
