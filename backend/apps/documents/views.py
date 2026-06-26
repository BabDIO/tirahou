from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import DocumentCategory, StudentDocument, GeneratedDocument
from .serializers import DocumentCategorySerializer, StudentDocumentSerializer, GeneratedDocumentSerializer


class DocumentCategoryViewSet(viewsets.ModelViewSet):
    queryset = DocumentCategory.objects.filter(is_active=True)
    serializer_class = DocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class StudentDocumentViewSet(viewsets.ModelViewSet):
    queryset = StudentDocument.objects.all().select_related('student', 'category')
    serializer_class = StudentDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'category', 'status']

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        serializer.save(
            uploaded_by=self.request.user,
            file_size=file.size if file else 0,
            mime_type=file.content_type if file else '',
        )

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        doc = self.get_object()
        doc.status = 'valide'
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document validé.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        doc = self.get_object()
        doc.status = 'rejete'
        doc.rejection_reason = request.data.get('reason', '')
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document rejeté.'})


class GeneratedDocumentViewSet(viewsets.ModelViewSet):
    queryset = GeneratedDocument.objects.all().select_related('student')
    serializer_class = GeneratedDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'doc_type', 'status']

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)


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
