"""
Authentification JWT pour les connexions WebSocket (Channels).

Le navigateur ne peut pas définir d'en-tête Authorization sur une requête
de handshake WebSocket, donc le token est passé en query string
(`?token=...`) plutôt que dans un header — c'est le token d'accès JWT déjà
utilisé pour les requêtes REST classiques.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token):
    from apps.accounts.models import User
    try:
        validated = AccessToken(token)
        return User.objects.get(id=validated['user_id'])
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope.get('query_string', b'').decode())
        token = (query_string.get('token') or [None])[0]
        scope['user'] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
