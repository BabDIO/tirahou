from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import LearningActivity, EngagementScore, DashboardStat
from .serializers import LearningActivitySerializer, EngagementScoreSerializer, DashboardStatSerializer


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


@extend_schema(responses={200: OpenApiResponse(description='Statistiques globales du dashboard')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def global_dashboard(request):
    from apps.people.models import Student, Teacher
    from apps.enrollment.models import AdminEnrollment
    from apps.finance.models import Invoice
    from apps.evaluation.models import SemesterResult
    from apps.lms.models import CourseSpace
    from django.db.models import Count
    from django.utils import timezone
    import datetime

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
    """AMÉLIORATION: Liste détaillée des étudiants à risque"""
    at_risk = EngagementScore.objects.filter(
        dropout_risk__in=['eleve', 'critique']
    ).select_related('student', 'course_space').order_by('-dropout_risk', 'engagement_score')
    
    results = []
    for score in at_risk:
        # Calculer la prédiction si pas déjà fait
        if not score.success_prediction_score:
            score.calculate_success_prediction()
        
        results.append({
            'student_id': score.student.id,
            'student_name': score.student.user.get_full_name(),
            'student_number': score.student.student_id,
            'course': score.course_space.title,
            'risk_level': score.dropout_risk,
            'prediction_score': float(score.success_prediction_score),
            'success_probability': score.success_probability,
            'engagement_score': float(score.engagement_score),
            'completion_rate': float(score.completion_rate),
            'days_inactive': score.days_inactive,
            'recommendations': score.recommendations,
            'contact_email': score.student.user.email,
        })
    
    return Response({
        'count': len(results),
        'students': results
    })


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
