from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import Application, ApplicationDocument, AdmissionDecision
from .serializers import ApplicationSerializer, ApplicationDocumentSerializer, AdmissionDecisionSerializer

# Rôles habilités à traiter les candidatures de tous les postulants (mêmes
# rôles que ceux autorisés côté frontend sur la page /admissions). Tout
# autre utilisateur authentifié ne peut voir/agir que sur ses propres
# candidatures — nécessaire puisque n'importe quel compte peut légitimement
# déposer une candidature (voir ApplicationViewSet.perform_create).
ADMISSIONS_STAFF_ROLES = ['super_admin', 'admin_institutionnel', 'admin_scolarite']


def _is_admissions_staff(user):
    return user.is_superuser or user.roles.filter(name__in=ADMISSIONS_STAFF_ROLES).exists()


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all().select_related('applicant', 'program', 'academic_year').order_by('id')
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'program', 'academic_year']
    search_fields = ['application_number', 'applicant__first_name', 'applicant__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Application.objects.none()
        qs = Application.objects.all().select_related('applicant', 'program', 'academic_year')
        if _is_admissions_staff(self.request.user):
            return qs.order_by('id')
        return qs.filter(applicant=self.request.user).order_by('id')

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        app = self.get_object()
        if app.applicant != request.user:
            return Response({'detail': "Vous ne pouvez soumettre que votre propre candidature."}, status=status.HTTP_403_FORBIDDEN)
        if app.status != 'brouillon':
            return Response({'detail': 'Candidature déjà soumise.'}, status=status.HTTP_400_BAD_REQUEST)
        app.status = 'soumise'
        app.submitted_at = timezone.now()
        app.save()
        return Response({'detail': 'Candidature soumise avec succès.'})

    @action(detail=True, methods=['post'])
    def start_review(self, request, pk=None):
        if not _is_admissions_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        app = self.get_object()
        app.status = 'en_instruction'
        app.reviewed_by = request.user
        app.save()
        return Response({'detail': 'Instruction démarrée.'})

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        if not _is_admissions_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        app = self.get_object()
        serializer = AdmissionDecisionSerializer(data=request.data)
        if serializer.is_valid():
            decision = serializer.save(application=app, decided_by=request.user)
            app.status = decision.decision if decision.decision != 'admis_attente' else 'admis_liste_attente'
            app.save()
            try:
                from apps.core.tasks import dispatch_webhook
                dispatch_webhook('admission.decided', {
                    'application_number': app.application_number, 'decision': decision.decision,
                    'program': app.program.name,
                })
            except Exception:
                pass
            return Response(AdmissionDecisionSerializer(decision).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def publish_decisions(self, request):
        """
        Publication groupée des résultats d'admission (listes principale,
        attente, refus) pour un programme + année académique donnés.
        Les candidats peuvent ensuite consulter leur résultat via
        `check_admission_result` (endpoint public par numéro de dossier).
        """
        if not _is_admissions_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        program_id = request.data.get('program')
        academic_year_id = request.data.get('academic_year')
        if not program_id or not academic_year_id:
            return Response({'error': 'program et academic_year requis'}, status=400)

        decisions = AdmissionDecision.objects.filter(
            application__program_id=program_id,
            application__academic_year_id=academic_year_id,
            is_published=False,
        ).select_related('application__applicant')

        count = 0
        for decision in decisions:
            decision.is_published = True
            decision.published_at = timezone.now()
            decision.save(update_fields=['is_published', 'published_at'])
            try:
                from apps.communication.notification_service import NotificationService
                NotificationService.send_notification(
                    recipient_id=decision.application.applicant.id,
                    title="Résultat de votre candidature disponible",
                    message=f"Le résultat de votre candidature {decision.application.application_number} a été publié.",
                    notif_type='admission',
                    priority='urgent',
                    action_url=f'/verify-admission?number={decision.application.application_number}',
                    icon='award',
                    color='blue',
                )
            except Exception:
                pass
            count += 1

        return Response({'detail': f'{count} résultat(s) publié(s).'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_admission_result(request):
    """
    Consultation publique du résultat d'une candidature par numéro de
    dossier — ne renvoie que les décisions publiées (voir
    ApplicationViewSet.publish_decisions), et un minimum d'informations
    pour éviter toute fuite de données personnelles en masse.
    """
    number = request.query_params.get('application_number', '').strip()
    if not number:
        return Response({'error': 'application_number requis'}, status=400)

    try:
        app = Application.objects.select_related('applicant', 'program', 'decision').get(
            application_number=number
        )
    except Application.DoesNotExist:
        return Response({'error': 'Aucune candidature trouvée pour ce numéro.'}, status=404)

    decision = getattr(app, 'decision', None)
    if not decision or not decision.is_published:
        return Response({'error': 'Résultat non encore publié pour ce dossier.'}, status=404)

    return Response({
        'application_number': app.application_number,
        'applicant_name': app.applicant.get_full_name(),
        'program_name': app.program.name,
        'decision': decision.decision,
        'decision_display': decision.get_decision_display(),
        'acceptance_deadline': decision.acceptance_deadline,
        'published_at': decision.published_at,
    })


class ApplicationDocumentViewSet(viewsets.ModelViewSet):
    queryset = ApplicationDocument.objects.all().order_by('id')
    serializer_class = ApplicationDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['application', 'doc_type', 'status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ApplicationDocument.objects.none()
        qs = ApplicationDocument.objects.all().select_related('application__applicant')
        if _is_admissions_staff(self.request.user):
            return qs.order_by('id')
        return qs.filter(application__applicant=self.request.user).order_by('id')

    def perform_create(self, serializer):
        application = serializer.validated_data.get('application')
        if application and application.applicant != self.request.user and not _is_admissions_staff(self.request.user):
            raise PermissionDenied("Vous ne pouvez déposer un document que sur votre propre candidature.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        if not _is_admissions_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        doc.status = 'valide'
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document validé.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not _is_admissions_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        doc.status = 'rejete'
        doc.rejection_reason = request.data.get('reason', '')
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()
        return Response({'detail': 'Document rejeté.'})
