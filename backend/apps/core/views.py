from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WebhookSubscription, WebhookDelivery
from .serializers import WebhookSubscriptionSerializer, WebhookDeliverySerializer
from apps.accounts.permissions import HasModulePermission


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
