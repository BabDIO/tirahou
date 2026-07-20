"""Authentification JWT étendue — positionne le contexte RLS PostgreSQL."""
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.core.rls import set_rls_context


class RLSAwareJWTAuthentication(JWTAuthentication):
    """
    Identique à JWTAuthentication, avec un effet de bord : dès qu'un
    utilisateur est authentifié avec succès, positionne le contexte
    PostgreSQL (apps.core.rls.set_rls_context) utilisé par les politiques
    Row-Level Security sur les tables sensibles. DRF authentifie
    l'utilisateur pendant le traitement de la vue (pas dans le middleware
    Django), c'est donc ici — et pas dans un middleware classique — que le
    contexte peut être positionné avec l'utilisateur réel.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, token = result
            set_rls_context(user)
        return result
