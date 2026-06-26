from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .pdf_views import (
    generate_certificat_pdf, generate_releve_pdf,
    compute_results, student_transcript,
    generate_fiche_inscription_pdf, generate_carte_etudiant_pdf,
)

router = DefaultRouter()
router.register('categories', views.DocumentCategoryViewSet)
router.register('student-documents', views.StudentDocumentViewSet)
router.register('generated-documents', views.GeneratedDocumentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('verify/<str:verification_code>/', views.verify_document, name='verify_document'),
    path('generate/certificat/<uuid:student_id>/', generate_certificat_pdf, name='generate_certificat'),
    path('generate/releve/<uuid:student_id>/', generate_releve_pdf, name='generate_releve'),
    path('generate/fiche-inscription/<uuid:student_id>/', generate_fiche_inscription_pdf, name='generate_fiche_inscription'),
    path('generate/carte-etudiant/<uuid:student_id>/', generate_carte_etudiant_pdf, name='generate_carte_etudiant'),
    path('compute-results/', compute_results, name='compute_results'),
    path('transcript/<uuid:student_id>/', student_transcript, name='student_transcript'),
]
