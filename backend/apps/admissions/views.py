from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Application, ApplicationDocument, AdmissionDecision
from .serializers import ApplicationSerializer, ApplicationDocumentSerializer, AdmissionDecisionSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all().select_related('applicant', 'program', 'academic_year').order_by('id')
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'program', 'academic_year']
    search_fields = ['application_number', 'applicant__first_name', 'applicant__last_name']

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        app = self.get_object()
        if app.status != 'brouillon':
            return Response({'detail': 'Candidature déjà soumise.'}, status=status.HTTP_400_BAD_REQUEST)
        app.status = 'soumise'
        app.submitted_at = timezone.now()
        app.save()
        return Response({'detail': 'Candidature soumise avec succès.'})

    @action(detail=True, methods=['post'])
    def start_review(self, request, pk=None):
        app = self.get_object()
        app.status = 'en_instruction'
        app.reviewed_by = request.user
        app.save()
        return Response({'detail': 'Instruction démarrée.'})

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        app = self.get_object()
        serializer = AdmissionDecisionSerializer(data=request.data)
        if serializer.is_valid():
            decision = serializer.save(application=app, decided_by=request.user)
            app.status = decision.decision if decision.decision != 'admis_attente' else 'admis_liste_attente'
            app.save()
            return Response(AdmissionDecisionSerializer(decision).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApplicationDocumentViewSet(viewsets.ModelViewSet):
    queryset = ApplicationDocument.objects.all().order_by('id')
    serializer_class = ApplicationDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['application', 'doc_type', 'status']

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
