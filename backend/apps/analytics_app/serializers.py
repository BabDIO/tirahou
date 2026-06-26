from rest_framework import serializers
from .models import LearningActivity, EngagementScore, DashboardStat


class LearningActivitySerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = LearningActivity
        fields = '__all__'


class EngagementScoreSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    risk_display = serializers.CharField(source='get_dropout_risk_display', read_only=True)

    class Meta:
        model = EngagementScore
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class DashboardStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStat
        fields = '__all__'
