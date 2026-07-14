from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

API_V1 = 'api/v1/'


def api_root(request):
    return JsonResponse({
        'name': 'TIRAHOU API',
        'status': 'ok',
        'docs': request.build_absolute_uri('/api/docs/'),
        'schema': request.build_absolute_uri('/api/schema/'),
        'api': request.build_absolute_uri('/api/v1/'),
    })


urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),

    # Documentation API
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Auth & Utilisateurs
    path(API_V1, include('apps.accounts.urls')),

    # Structure académique
    path(API_V1, include('apps.academic.urls')),

    # Programmes LMD
    path(API_V1, include('apps.programs.urls')),

    # Personnes
    path(API_V1, include('apps.people.urls')),

    # Admissions
    path(API_V1, include('apps.admissions.urls')),

    # Inscriptions
    path(API_V1, include('apps.enrollment.urls')),

    # Finance
    path(API_V1, include('apps.finance.urls')),

    # Documents & GED
    path(API_V1 + 'documents/', include('apps.documents.urls')),

    # Évaluation & Notes — ViewSets CRUD
    path(API_V1, include('apps.evaluation.urls')),
    # Évaluation — Endpoints dédiés par acteur (student/, teacher/, admin/)
    path(API_V1 + 'evaluation/', include('apps.evaluation.extra_urls')),

    # LMS / Campus virtuel
    path(API_V1, include('apps.lms.urls')),

    # Classes virtuelles
    path(API_V1, include('apps.virtual_class.urls')),

    # Présences
    path(API_V1, include('apps.attendance.urls')),

    # Planning
    path(API_V1, include('apps.scheduling_app.urls')),

    # Stages & Mémoires
    path(API_V1, include('apps.internships.urls')),

    # Communication
    path(API_V1, include('apps.communication.urls')),

    # Analytics
    path(API_V1 + 'analytics/', include('apps.analytics_app.urls')),

    # Bibliothèque numérique
    path(API_V1, include('apps.library.urls')),

    # Marketplace de cours
    path(API_V1 + 'marketplace/', include('apps.marketplace.urls')),

    # API Utilitaires (health, info, stats)
    path(API_V1, include('apps.api.urls')),

    # Webhooks sortants
    path(API_V1, include('apps.core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
