from django.conf import settings
from django.http import Http404
from django.views.static import serve as static_serve
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from .models import WebhookSubscription, WebhookDelivery
from .serializers import WebhookSubscriptionSerializer, WebhookDeliverySerializer
from apps.accounts.permissions import HasModulePermission

# Préfixes de MEDIA_ROOT contenant des documents personnels sensibles
# (pièces d'identité, diplômes, certificats médicaux...) — servis jusqu'ici
# par django.views.static.serve SANS AUCUN contrôle d'accès (voir
# config/urls.py) : quiconque connaît/devine/récupère l'URL peut
# télécharger le fichier de n'importe qui, authentifié ou non, quels que
# soient les contrôles de rôle déjà en place sur l'API DRF elle-même — ces
# contrôles ne portent que sur les endpoints /api/, jamais sur /media/.
_PROTECTED_MEDIA_PREFIXES = ('ged/students/', 'admissions/documents/', 'attendance/justifications/')


def _can_access_protected_media(user, relative_path):
    if user.is_superuser:
        return True

    if relative_path.startswith('ged/students/'):
        from apps.documents.models import StudentDocument
        from apps.documents.views import _is_document_manager
        doc = StudentDocument.objects.filter(file=relative_path).select_related('student').first()
        if not doc:
            return False
        if hasattr(user, 'student_profile') and doc.student_id == user.student_profile.id:
            return True
        return _is_document_manager(user)

    if relative_path.startswith('admissions/documents/'):
        from apps.admissions.models import ApplicationDocument
        from apps.admissions.views import _is_admissions_staff
        doc = ApplicationDocument.objects.filter(file=relative_path).select_related('application').first()
        if not doc:
            return False
        if doc.application.applicant_id == user.id:
            return True
        return _is_admissions_staff(user)

    if relative_path.startswith('attendance/justifications/'):
        from apps.attendance.models import AttendanceRecord
        from apps.attendance.views import _can_manage_attendance_record
        record = AttendanceRecord.objects.filter(justification_file=relative_path).select_related('student').first()
        if not record:
            return False
        if hasattr(user, 'student_profile') and record.student_id == user.student_profile.id:
            return True
        return _can_manage_attendance_record(user, record)

    return False


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def protected_media_serve(request, path):
    """
    Sert les fichiers sous _PROTECTED_MEDIA_PREFIXES après vérification que
    l'utilisateur authentifié est bien le propriétaire du document ou un
    membre du personnel habilité à le consulter — voir config/urls.py pour
    le montage (doit être déclaré AVANT le fallback static_serve général).
    404 plutôt que 403 en cas de refus, pour ne pas confirmer l'existence
    d'un fichier à un tiers qui n'a pas le droit de le voir.
    """
    if not any(path.startswith(p) for p in _PROTECTED_MEDIA_PREFIXES):
        raise Http404()
    if not _can_access_protected_media(request.user, path):
        raise Http404()
    return static_serve(request._request, path, document_root=settings.MEDIA_ROOT)


class WebhookSubscriptionViewSet(viewsets.ModelViewSet):
    """Gestion des abonnements webhooks sortants — réservé aux administrateurs."""
    queryset = WebhookSubscription.objects.all()
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'accounts'
    filterset_fields = ['event_type', 'is_active']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Envoie un événement de test à l'URL configurée."""
        from .tasks import deliver_webhook_task
        subscription = self.get_object()
        deliver_webhook_task.delay(str(subscription.id), 'test', {'message': 'Ceci est un test TIRAHOU.'})
        return Response({'detail': "Test envoyé — consultez l'historique des livraisons."})


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WebhookDelivery.objects.all().select_related('subscription')
    serializer_class = WebhookDeliverySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'accounts'
    filterset_fields = ['subscription', 'event_type', 'success']
