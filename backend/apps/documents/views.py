from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import DocumentCategory, StudentDocument, GeneratedDocument
from .serializers import DocumentCategorySerializer, StudentDocumentSerializer, GeneratedDocumentSerializer

# Rôles habilités à valider/rejeter les documents déposés par les étudiants
# (scolarité) — une pièce d'identité, un diplôme ou un relevé de notes ne
# doit jamais pouvoir être auto-validé par la personne qui l'a déposé.
DOCUMENT_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique',
)


def _is_document_manager(user):
    return user.is_superuser or user.roles.filter(name__in=DOCUMENT_MANAGER_ROLES).exists()


# Pièces d'identité, diplômes, relevés de notes... aucune limite de taille
# ni de format n'était appliquée sur cet upload (contrairement à
# apps/internships qui a le même genre de contrôle).
MAX_DOCUMENT_UPLOAD_MB = 10
ALLOWED_DOCUMENT_EXTENSIONS = ('pdf', 'jpg', 'jpeg', 'png')


def _validate_document_upload(f):
    if not f:
        return None
    if f.size > MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024:
        return f'Fichier trop volumineux (max {MAX_DOCUMENT_UPLOAD_MB} Mo).'
    ext = f.name.rsplit('.', 1)[-1].lower() if '.' in f.name else ''
    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        return f"Format non autorisé (extensions acceptées : {', '.join(ALLOWED_DOCUMENT_EXTENSIONS)})."
    return None


class DocumentCategoryViewSet(viewsets.ModelViewSet):
    queryset = DocumentCategory.objects.filter(is_active=True)
    serializer_class = DocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Aucun contrôle n'existait sur ce catalogue de référence (utilisé
        # pour classer les documents officiels) — n'importe quel étudiant
        # pouvait y ajouter une catégorie.
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_update(self, serializer):
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        instance.delete()


class StudentDocumentViewSet(viewsets.ModelViewSet):
    queryset = StudentDocument.objects.all().select_related('student', 'category')
    serializer_class = StudentDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'category', 'status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return StudentDocument.objects.none()
        user = self.request.user
        qs = StudentDocument.objects.select_related('student__user', 'category')
        # Étudiant : seulement ses documents
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        # Enseignant : aucun accès aux documents personnels
        if hasattr(user, 'teacher_profile'):
            return StudentDocument.objects.none()
        return qs

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        error = _validate_document_upload(file)
        if error:
            raise serializers.ValidationError({'file': error})
        serializer.save(
            student=self.request.user.student_profile,
            uploaded_by=self.request.user,
            file_size=file.size if file else 0,
            mime_type=file.content_type if file else '',
        )

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        # Faille corrigée : rien n'empêchait auparavant un étudiant de
        # valider LUI-MÊME le document qu'il venait de déposer (identité,
        # diplôme, relevé de notes...). Confirmé en direct sur la prod.
        if not _is_document_manager(request.user):
            return Response({'detail': 'Réservé à la scolarité.'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        doc.status = 'valide'
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document validé.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not _is_document_manager(request.user):
            return Response({'detail': 'Réservé à la scolarité.'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        doc.status = 'rejete'
        doc.rejection_reason = request.data.get('reason', '')
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document rejeté.'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        if not _is_document_manager(request.user):
            return Response({'detail': 'Réservé à la scolarité.'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        doc.status = 'archive'
        doc.save()
        return Response({'detail': 'Document archivé.'})


class GeneratedDocumentViewSet(viewsets.ModelViewSet):
    queryset = GeneratedDocument.objects.all().select_related('student')
    serializer_class = GeneratedDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'doc_type', 'status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return GeneratedDocument.objects.none()
        user = self.request.user
        qs = GeneratedDocument.objects.select_related('student__user')
        # Étudiant : seulement ses documents générés
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        # Enseignant : aucun accès
        if hasattr(user, 'teacher_profile'):
            return GeneratedDocument.objects.none()
        return qs

    def perform_create(self, serializer):
        # Faille CRITIQUE corrigée : rien n'empêchait un étudiant de générer
        # lui-même un document officiel (diplôme, relevé de notes, PV de
        # délibération...) avec le statut "signe", et de le rendre
        # publiquement vérifiable via /documents/verify/<code>/ — fraude aux
        # diplômes. Confirmé en direct sur la prod (HTTP 201, puis
        # "valid": true sur l'endpoint public de vérification).
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save(generated_by=self.request.user)

    def perform_update(self, serializer):
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_document_manager(self.request.user):
            raise PermissionDenied("Réservé à la scolarité.")
        instance.delete()


@extend_schema(responses={200: OpenApiResponse(description='Résultat de vérification du document')})
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def verify_document(request, verification_code):
    try:
        doc = GeneratedDocument.objects.get(verification_code=verification_code)
        return Response({
            'valid': True,
            'doc_type': doc.get_doc_type_display(),
            'student': doc.student.user.get_full_name(),
            'generated_at': doc.created_at,
            'status': doc.status,
        })
    except GeneratedDocument.DoesNotExist:
        return Response({'valid': False, 'detail': 'Document introuvable.'}, status=status.HTTP_404_NOT_FOUND)
