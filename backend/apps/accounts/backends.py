"""
Backend d'authentification personnalisé pour connexion par email
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()

MAX_FAILED_LOGIN_ATTEMPTS = 5


class EmailBackend(ModelBackend):
    """
    Authentification par email au lieu du username.

    Le verrouillage de compte après échecs répétés (is_locked/
    failed_login_attempts) n'était implémenté QUE dans
    CustomTokenObtainSerializer.validate() (API JWT custom) — ce backend,
    lui, est aussi celui utilisé par /admin/login/ (Django admin), qui
    n'avait donc aucun compteur d'échecs ni de blocage : un compte
    verrouillé pouvait toujours se connecter à l'admin Django, sans aucune
    protection anti brute-force sur ce formulaire. La logique vit
    maintenant ici, au niveau du backend, pour s'appliquer à tout point
    d'entrée d'authentification uniformément.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get('email', username)
        if email is None:
            return None

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.is_locked:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            if user.failed_login_attempts:
                user.failed_login_attempts = 0
                user.save(update_fields=['failed_login_attempts'])
            return user

        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            user.is_locked = True
        user.save(update_fields=['failed_login_attempts', 'is_locked'])
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
