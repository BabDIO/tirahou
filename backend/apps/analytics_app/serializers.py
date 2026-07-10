from rest_framework import serializers
from .models import LearningActivity, EngagementScore, DashboardStat
from .extensions_models import Badge, StudentBadge, Wallet, WalletTransaction


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


class BadgeSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Badge
        fields = '__all__'


class StudentBadgeSerializer(serializers.ModelSerializer):
    badge_detail = BadgeSerializer(source='badge', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentBadge
        fields = '__all__'
        read_only_fields = ['awarded_by', 'awarded_at', 'verification_code']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class WalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = WalletTransaction
        fields = '__all__'


class WalletSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class DashboardStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStat
        fields = '__all__'
