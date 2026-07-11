from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import LearningActivity, EngagementScore, DashboardStat
from .extensions_models import Badge, StudentBadge, Wallet, WalletTransaction
from .serializers import (
    LearningActivitySerializer, EngagementScoreSerializer, DashboardStatSerializer,
    BadgeSerializer, StudentBadgeSerializer, WalletSerializer, WalletTransactionSerializer,
)


class LearningActivityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LearningActivity.objects.all().select_related('student', 'course_space')
    serializer_class = LearningActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'course_space', 'action']
    ordering_fields = ['timestamp']


class EngagementScoreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EngagementScore.objects.all().select_related('student', 'course_space')
    serializer_class = EngagementScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'academic_year', 'dropout_risk']
    ordering_fields = ['engagement_score', 'completion_rate']

    @action(detail=False, methods=['get'])
    def at_risk(self, request):
        at_risk = self.get_queryset().filter(dropout_risk__in=['eleve', 'critique'])
        return Response(EngagementScoreSerializer(at_risk, many=True).data)


class DashboardStatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DashboardStat.objects.all()
    serializer_class = DashboardStatSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['stat_type', 'academic_year']


class BadgeViewSet(viewsets.ModelViewSet):
    """Catalogue des badges numériques (8.30.2 / S2)."""
    queryset = Badge.objects.filter(is_active=True)
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'is_published']


class StudentBadgeViewSet(viewsets.ModelViewSet):
    """Attribution de badges aux étudiants."""
    queryset = StudentBadge.objects.all().select_related('student__user', 'badge')
    serializer_class = StudentBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'badge']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return StudentBadge.objects.none()
        user = self.request.user
        qs = StudentBadge.objects.select_related('student__user', 'badge')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    def perform_create(self, serializer):
        serializer.save(awarded_by=self.request.user)


class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    """Portefeuille de points/récompenses (8.30.3 / S3)."""
    queryset = Wallet.objects.all().select_related('student__user').prefetch_related('transactions')
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Wallet.objects.none()
        user = self.request.user
        qs = Wallet.objects.select_related('student__user').prefetch_related('transactions')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not hasattr(request.user, 'student_profile'):
            return Response({'error': 'Réservé aux étudiants.'}, status=404)
        wallet, _ = Wallet.objects.get_or_create(student=request.user.student_profile)
        return Response(WalletSerializer(wallet).data)

    @action(detail=False, methods=['post'])
    def credit(self, request):
        """Créditer/débiter le portefeuille d'un étudiant (usage administratif) — crée le portefeuille s'il n'existe pas encore."""
        from apps.people.models import Student
        student_id = request.data.get('student')
        tx_type = request.data.get('type', 'reward')
        amount = request.data.get('amount')
        description = request.data.get('description', '')
        if not student_id or not amount:
            return Response({'detail': 'student et amount sont requis.'}, status=400)
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Étudiant introuvable.'}, status=404)

        wallet, _ = Wallet.objects.get_or_create(student=student)
        amount = abs(float(amount))
        transaction = WalletTransaction.objects.create(
            wallet=wallet, type=tx_type, amount=amount, description=description,
        )
        if tx_type in ('credit', 'reward'):
            wallet.balance += transaction.amount
            wallet.total_earned += transaction.amount
        else:
            wallet.balance -= transaction.amount
            wallet.total_spent += transaction.amount
        wallet.save(update_fields=['balance', 'total_earned', 'total_spent', 'updated_at'])
        return Response(WalletSerializer(wallet).data, status=201)


class WalletTransactionViewSet(viewsets.ModelViewSet):
    """Crédite/débite un portefeuille — usage administratif (attribution de points)."""
    queryset = WalletTransaction.objects.all().select_related('wallet__student__user')
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['wallet', 'type']

    def perform_create(self, serializer):
        transaction = serializer.save()
        wallet = transaction.wallet
        if transaction.type in ('credit', 'reward'):
            wallet.balance += transaction.amount
            wallet.total_earned += transaction.amount
        else:
            wallet.balance -= transaction.amount
            wallet.total_spent += transaction.amount
        wallet.save(update_fields=['balance', 'total_earned', 'total_spent', 'updated_at'])


@extend_schema(responses={200: OpenApiResponse(description='Statistiques globales du dashboard')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def global_dashboard(request):
    from apps.people.models import Student, Teacher
    from apps.enrollment.models import AdminEnrollment
    from apps.finance.models import Invoice
    from apps.evaluation.models import SemesterResult
    from apps.lms.models import CourseSpace
    from apps.attendance.models import AbsenceSummary
    from django.db.models import Count, Avg

    # Taux d'assiduité global réel
    attendance_data = AbsenceSummary.objects.filter(
        total_sessions__gt=0
    ).aggregate(avg_rate=Avg('attendance_rate'))
    attendance_rate = round(float(attendance_data['avg_rate'] or 0), 1)

    data = {
        'students': {
            'total': Student.objects.filter(is_active=True).count(),
            'by_status': list(Student.objects.values('status').annotate(count=Count('id'))),
        },
        'enrollments': {
            'total': AdminEnrollment.objects.filter(status='validee').count(),
        },
        'finance': {
            'total_invoiced': Invoice.objects.aggregate(total=Sum('total_amount'))['total'] or 0,
            'total_paid': Invoice.objects.aggregate(paid=Sum('paid_amount'))['paid'] or 0,
        },
        'courses': {
            'total_spaces': CourseSpace.objects.filter(is_published=True).count(),
        },
        'results': {
            'average': SemesterResult.objects.filter(published=True).aggregate(avg=Avg('average'))['avg'] or 0,
        },
        'attendance': {
            'global_rate': attendance_rate,
        },
        'enrollment_trend': _get_enrollment_trend(),
    }
    return Response(data)


def _get_enrollment_trend():
    """Retourne la tendance des inscriptions sur les 6 derniers mois."""
    from apps.enrollment.models import AdminEnrollment
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    from django.utils import timezone
    import datetime

    six_months_ago = timezone.now() - datetime.timedelta(days=180)
    trend = (
        AdminEnrollment.objects
        .filter(created_at__gte=six_months_ago, status='validee')
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    result = []
    for item in trend:
        result.append({
            'month': MONTHS_FR[item['month'].month - 1],
            'inscrits': item['count'],
        })
    return result


@extend_schema(responses={200: OpenApiResponse(description='Statistiques LMS détaillées')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def attendance_stats(request):
    """Statistiques d'assiduité globales réelles."""
    from apps.attendance.models import AbsenceSummary, AttendanceRecord
    from django.db.models import Avg, Count

    course_space_id = request.query_params.get('course_space')
    student_id = request.query_params.get('student')

    qs = AbsenceSummary.objects.filter(total_sessions__gt=0)
    if course_space_id:
        qs = qs.filter(course_space_id=course_space_id)
    if student_id:
        qs = qs.filter(student_id=student_id)

    agg = qs.aggregate(
        avg_rate=Avg('attendance_rate'),
        avg_punctuality=Avg('punctuality_rate'),
        total_absences=Sum('absent_count'),
        total_justified=Sum('justified_count'),
    )

    alert_counts = qs.values('alert_level').annotate(count=Count('id'))

    return Response({
        'global_rate': round(float(agg['avg_rate'] or 0), 1),
        'punctuality_rate': round(float(agg['avg_punctuality'] or 0), 1),
        'total_absences': agg['total_absences'] or 0,
        'total_justified': agg['total_justified'] or 0,
        'by_alert_level': list(alert_counts),
        'at_risk_count': qs.filter(alert_level__in=['critical', 'exclusion_risk']).count(),
    })


@extend_schema(responses={200: OpenApiResponse(description='Statistiques LMS détaillées')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def lms_stats(request):
    """Stats LMS réelles : progression, activité, complétion."""
    from apps.lms.models import CourseSpace, StudentProgress, AssignmentSubmission, QuizAttempt
    from apps.virtual_class.models import VirtualClassSession
    from django.db.models import Avg, Count, Sum

    course_space_id = request.query_params.get('course_space')

    qs_progress = StudentProgress.objects.all()
    qs_sessions = VirtualClassSession.objects.all()

    if course_space_id:
        qs_progress = qs_progress.filter(course_space_id=course_space_id)
        qs_sessions = qs_sessions.filter(course_space_id=course_space_id)

    stats = {
        'avg_completion': qs_progress.aggregate(avg=Avg('completion_rate'))['avg'] or 0,
        'avg_time_minutes': qs_progress.aggregate(avg=Avg('total_time_minutes'))['avg'] or 0,
        'total_students_active': qs_progress.filter(completion_rate__gt=0).count(),
        'assignments_submitted': AssignmentSubmission.objects.count(),
        'quiz_attempts': QuizAttempt.objects.count(),
        'virtual_sessions_total': qs_sessions.count(),
        'virtual_sessions_done': qs_sessions.filter(status='terminee').count(),
        'by_completion': [
            {'range': '0-25%', 'count': qs_progress.filter(completion_rate__lte=25).count()},
            {'range': '26-50%', 'count': qs_progress.filter(completion_rate__gt=25, completion_rate__lte=50).count()},
            {'range': '51-75%', 'count': qs_progress.filter(completion_rate__gt=50, completion_rate__lte=75).count()},
            {'range': '76-100%', 'count': qs_progress.filter(completion_rate__gt=75).count()},
        ],
    }
    return Response(stats)


@extend_schema(responses={200: OpenApiResponse(description='Prédiction de réussite avec recommandations')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def predict_student_success(request):
    """AMÉLIORATION: Prédiction de réussite basée sur EngagementScore"""
    student_id = request.query_params.get('student_id')
    if not student_id:
        return Response({'error': 'student_id requis'}, status=400)
    
    try:
        from apps.people.models import Student
        student = Student.objects.get(id=student_id)
        
        # Récupérer ou créer le score d'engagement
        engagement_scores = EngagementScore.objects.filter(student=student)
        
        if not engagement_scores.exists():
            return Response({'error': 'Aucune donnée d\'engagement disponible'}, status=404)
        
        # Calculer la prédiction pour chaque cours
        predictions = []
        for score in engagement_scores:
            score.calculate_success_prediction()
            predictions.append({
                'course': score.course_space.title,
                'prediction_score': float(score.success_prediction_score),
                'success_probability': score.success_probability,
                'risk_level': score.dropout_risk,
                'recommendations': score.recommendations,
                'engagement_score': float(score.engagement_score),
                'completion_rate': float(score.completion_rate),
                'days_inactive': score.days_inactive,
            })
        
        # Score global
        avg_prediction = sum(p['prediction_score'] for p in predictions) / len(predictions)
        
        return Response({
            'student_id': student_id,
            'student_name': student.user.get_full_name(),
            'overall_prediction_score': round(avg_prediction, 2),
            'courses': predictions,
        })
    except Student.DoesNotExist:
        return Response({'error': 'Étudiant non trouvé'}, status=404)


@extend_schema(responses={200: OpenApiResponse(description='Étudiants à risque avec détails')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def students_at_risk(request):
    """Liste détaillée des étudiants à risque de décrochage."""
    at_risk = EngagementScore.objects.filter(
        dropout_risk__in=['eleve', 'critique']
    ).select_related('student__user', 'course_space').order_by('-dropout_risk', 'engagement_score')

    results = []
    for score in at_risk:
        # Calcul prédictif robuste — ne pas sauvegarder pour éviter les erreurs
        try:
            if not score.success_prediction_score:
                from apps.evaluation.models import Grade
                from apps.attendance.models import AttendanceRecord
                from django.db.models import Avg
                avg_g = Grade.objects.filter(student=score.student).aggregate(avg=Avg('final_grade'))['avg'] or 0
                att_total = AttendanceRecord.objects.filter(student=score.student).count()
                att_pres  = AttendanceRecord.objects.filter(student=score.student, status='present').count()
                att_rate  = (att_pres / max(att_total, 1)) * 100
                pred = float(avg_g) * 0.35 + att_rate * 0.25 + float(score.engagement_score) * 0.15 + float(score.completion_rate) * 0.25
                score.success_prediction_score = round(min(100, max(0, pred)), 2)
        except Exception:
            pass

        results.append({
            'student_id': str(score.student.id),
            'student_name': score.student.user.get_full_name(),
            'student_number': score.student.student_id,
            'course': score.course_space.title,
            'risk_level': score.dropout_risk,
            'prediction_score': float(score.success_prediction_score or 0),
            'success_probability': score.success_probability or '',
            'engagement_score': float(score.engagement_score),
            'completion_rate': float(score.completion_rate),
            'days_inactive': score.days_inactive,
            'recommendations': score.recommendations or [],
            'contact_email': score.student.user.email,
        })

    return Response({'count': len(results), 'students': results})


@extend_schema(responses={200: OpenApiResponse(description='Prédiction de réussite étudiant')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def predict_success(request):
    """Prédiction de réussite pour un étudiant"""
    from .advanced_analytics import predict_student_success
    
    student_id = request.query_params.get('student_id')
    if not student_id:
        return Response({'error': 'student_id requis'}, status=400)
    
    prediction = predict_student_success(student_id)
    if not prediction:
        return Response({'error': 'Étudiant non trouvé'}, status=404)
    
    return Response(prediction)


@extend_schema(responses={200: OpenApiResponse(description='Analyse de cohorte')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cohort_analysis(request):
    """Analyse comparative des cohortes"""
    from .advanced_analytics import get_cohort_analysis
    
    academic_year_id = request.query_params.get('academic_year')
    data = get_cohort_analysis(academic_year_id)
    return Response(data)


@extend_schema(responses={200: OpenApiResponse(description='Tendances de performance')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def performance_trends(request):
    """Tendances de performance sur N jours"""
    from .advanced_analytics import get_performance_trends
    
    days = int(request.query_params.get('days', 30))
    data = get_performance_trends(days)
    return Response(data)


@extend_schema(responses={200: OpenApiResponse(description='Top performers')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def top_performers(request):
    """Top étudiants par performance"""
    from .advanced_analytics import get_top_performers
    
    limit = int(request.query_params.get('limit', 10))
    data = get_top_performers(limit)
    return Response(data)


@extend_schema(responses={200: OpenApiResponse(description='Étudiants à risque détaillés')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def at_risk_detailed(request):
    """Liste détaillée des étudiants à risque avec recommandations"""
    from .advanced_analytics import get_at_risk_students_detailed
    
    data = get_at_risk_students_detailed()
    return Response(data)
