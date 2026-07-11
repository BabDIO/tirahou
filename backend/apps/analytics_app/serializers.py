from rest_framework import serializers
from .models import LearningActivity, EngagementScore, DashboardStat
from .extensions_models import (
    Badge, StudentBadge, Wallet, WalletTransaction,
    MicroCertification, StudentCertification,
)


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


class MicroCertificationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    badge_name = serializers.CharField(source='badge.name', read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = MicroCertification
        fields = '__all__'
        read_only_fields = ['created_by']

    def get_enrolled_count(self, obj):
        return obj.studentcertification_set.count()


class StudentCertificationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    certification_detail = MicroCertificationSerializer(source='certification', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = StudentCertification
        fields = '__all__'
        read_only_fields = ['verification_code', 'enrolled_at']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class DashboardStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStat
        fields = '__all__'
