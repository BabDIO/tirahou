from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import connection
from drf_spectacular.utils import extend_schema, OpenApiResponse


@extend_schema(responses={200: OpenApiResponse(description='Statut de santé de l\'API')})
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint public de vérification de santé.
    Vérifie la connexion à la base de données et retourne
    le statut général de la plateforme.
    """
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        pass

    return Response({
        'status': 'ok' if db_ok else 'degraded',
        'platform': 'TIRAHOU',
        'version': '1.0.0',
        'timestamp': timezone.now().isoformat(),
        'services': {
            'api': 'up',
            'database': 'up' if db_ok else 'down',
        },
        'docs': '/api/docs/',
        'redoc': '/api/redoc/',
    })


@extend_schema(responses={200: OpenApiResponse(description='Informations sur l\'API TIRAHOU')})
@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """Informations générales sur l'API."""
    return Response({
        'name': 'TIRAHOU API',
        'description': 'Plateforme Intégrée de Gestion Universitaire',
        'version': '1.0.0',
        'modules': [
            'accounts', 'academic', 'programs', 'people',
            'admissions', 'enrollment', 'finance', 'documents',
            'evaluation', 'lms', 'virtual_class', 'attendance',
            'scheduling', 'internships', 'communication',
            'analytics', 'library',
        ],
        'endpoints_count': 525,
        'authentication': 'Bearer JWT',
        'docs_url': '/api/docs/',
    })


@extend_schema(responses={200: OpenApiResponse(description='Statistiques système')})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_stats(request):
    """
    Statistiques du tableau de bord Super Admin (réservé aux admins).
    Toutes les valeurs sont calculées depuis la base — aucune donnée
    inventée. `pending_tasks` agrège les files d'attente réelles
    (candidatures, documents, réclamations) qui nécessitent une action.
    """
    if not request.user.roles.filter(
        name__in=['super_admin', 'admin_institutionnel']
    ).exists():
        from rest_framework import status
        return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    from datetime import timedelta
    from django.db.models import Sum, Count
    from apps.people.models import Student, Teacher
    from apps.programs.models import Program
    from apps.lms.models import CourseSpace
    from apps.enrollment.models import AdminEnrollment
    from apps.finance.models import Invoice, Payment
    from apps.accounts.models import User, AuditLog
    from apps.documents.models import StudentDocument, GeneratedDocument
    from apps.admissions.models import Application
    from apps.evaluation.models import GradeContest, SemesterResult

    now = timezone.now()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = this_month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    students_total = Student.objects.filter(is_active=True).count()
    students_this_month = Student.objects.filter(is_active=True, created_at__gte=this_month_start).count()
    students_last_month = Student.objects.filter(is_active=True, created_at__gte=last_month_start, created_at__lte=last_month_end).count()
    trend = round(((students_this_month - students_last_month) / students_last_month) * 100, 1) if students_last_month else 0

    total_invoiced = float(Invoice.objects.aggregate(t=Sum('total_amount'))['t'] or 0)
    total_paid = float(Payment.objects.filter(status='valide').aggregate(t=Sum('amount'))['t'] or 0)

    programs_qs = Program.objects.filter(status='active').annotate(student_count=Count('students')).order_by('-student_count')[:6]

    recent_logs = AuditLog.objects.select_related('user').order_by('-timestamp')[:6]

    success_rate = None
    published_results = SemesterResult.objects.filter(published=True)
    if published_results.exists():
        admis = published_results.filter(decision='admis').count()
        success_rate = round((admis / published_results.count()) * 100, 1)

    return Response({
        'users': {
            'total': User.objects.filter(is_active=True).count(),
            'students': students_total,
            'teachers': Teacher.objects.filter(is_active=True).count(),
        },
        'students': {
            'total': students_total,
            'by_status': list(Student.objects.filter(is_active=True).values('status').annotate(count=Count('id')).order_by('-count')),
            'trend': trend,
        },
        'teachers': {
            'total': Teacher.objects.filter(is_active=True).count(),
            'by_status': list(Teacher.objects.filter(is_active=True).values('status').annotate(count=Count('id')).order_by('-count')),
        },
        'enrollments': {
            'total': AdminEnrollment.objects.count(),
            'validated': AdminEnrollment.objects.filter(status='validee').count(),
        },
        'finance': {
            'invoiced': total_invoiced,
            'collected': total_paid,
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'collection_rate': round((total_paid / total_invoiced) * 100, 1) if total_invoiced else 0,
        },
        'academic': {
            'programs': Program.objects.filter(status='active').count(),
            'courses': CourseSpace.objects.count(),
            'active_classes': CourseSpace.objects.filter(is_published=True).count(),
        },
        'programs': [
            {'name': p.name, 'status': p.status, 'students': p.student_count}
            for p in programs_qs
        ],
        'recent_activities': [
            {
                'action': log.get_action_display(),
                'user': log.user.get_full_name() if log.user else 'Système',
                'detail': log.description or log.module,
                'time': log.timestamp.strftime('%H:%M'),
                'type': {'create': 'success', 'validate': 'success', 'update': 'academic', 'delete': 'document'}.get(log.action, 'document'),
            }
            for log in recent_logs
        ],
        'documents_generated': GeneratedDocument.objects.count(),
        'success_rate': success_rate,
        'pending_tasks': (
            Application.objects.filter(status='soumise').count()
            + StudentDocument.objects.filter(status__in=['depose', 'en_verification']).count()
            + GradeContest.objects.filter(status='soumise').count()
        ),
        'timestamp': timezone.now().isoformat(),
    })
