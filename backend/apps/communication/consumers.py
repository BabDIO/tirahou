import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.serializers.json import DjangoJSONEncoder


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Un groupe Channels par utilisateur (`user_<id>`) : NotificationService
    y publie un message à chaque notification créée, relayé ici tel quel
    au client connecté sur ce socket.
    """

    @classmethod
    async def encode_json(cls, content):
        # json.dumps standard ne sait pas sérialiser un UUID (recipient est
        # une FK sur un id UUID) — DjangoJSONEncoder le gère nativement,
        # comme le fait déjà le JSONRenderer de DRF côté REST classique.
        return json.dumps(content, cls=DjangoJSONEncoder)

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.group_name = f'user_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send_json(event['data'])
