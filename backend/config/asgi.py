"""
ASGI config for config project.

Sert à la fois les requêtes HTTP classiques (via Django) et les connexions
WebSocket (notifications temps réel, voir apps.communication.routing).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# get_asgi_application() doit être appelé avant d'importer du code qui
# touche aux modèles Django (AppRegistryNotReady sinon).
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.communication.routing import websocket_urlpatterns  # noqa: E402
from apps.communication.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
    ),
})
