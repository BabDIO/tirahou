from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('webhook-subscriptions', views.WebhookSubscriptionViewSet)
router.register('webhook-deliveries', views.WebhookDeliveryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
