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
    """Statistiques rapides du système (admin seulement)."""
    if not request.user.roles.filter(
        name__in=['super_admin', 'admin_institutionnel']
    ).exists():
        from rest_framework import status
        return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    from apps.people.models import Student, Teacher
    from apps.enrollment.models import AdminEnrollment
    from apps.finance.models import Invoice, Payment
    from apps.accounts.models import User
    from django.db.models import Sum

    return Response({
        'users': {
            'total': User.objects.filter(is_active=True).count(),
            'students': Student.objects.filter(is_active=True).count(),
            'teachers': Teacher.objects.filter(is_active=True).count(),
        },
        'enrollments': {
            'total': AdminEnrollment.objects.count(),
            'validated': AdminEnrollment.objects.filter(status='validee').count(),
        },
        'finance': {
            'invoiced': float(Invoice.objects.aggregate(t=Sum('total_amount'))['t'] or 0),
            'collected': float(Payment.objects.filter(status='valide').aggregate(t=Sum('amount'))['t'] or 0),
        },
        'timestamp': timezone.now().isoformat(),
    })
