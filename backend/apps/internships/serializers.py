from rest_framework import serializers
from .models import Internship, Thesis, ThesisProgress, Defense


class InternshipSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Internship
        fields = '__all__'
        # status/évaluation en lecture seule : l'étudiant garde le droit de
        # PATCHer son propre stage (upload du rapport, infos entreprise —
        # voir MyInternshipPage.tsx), mais ne doit pouvoir ni changer le
        # statut ni s'auto-attribuer une note en contournant les actions
        # validate()/add_evaluation() de la vue (faille confirmée en direct :
        # un étudiant s'est mis 20/20 sur son propre stage).
        read_only_fields = [
            'status', 'supervisor_grade', 'supervisor_comment',
            'validated_by', 'validated_at', 'report_submitted_at',
        ]

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
