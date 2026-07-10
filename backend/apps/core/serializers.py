from rest_framework import serializers
from .models import WebhookSubscription, WebhookDelivery


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = WebhookSubscription
        fields = '__all__'
        read_only_fields = ['created_by']
        extra_kwargs = {'secret': {'write_only': True}}


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = '__all__'
