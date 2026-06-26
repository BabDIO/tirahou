from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Limite les tentatives de connexion (taux défini dans REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login'])."""
    scope = 'login'


class BurstRateThrottle(UserRateThrottle):
    """Limite les requêtes en rafale pour les utilisateurs authentifiés."""
    scope = 'burst'
    rate = '60/minute'


class SustainedRateThrottle(UserRateThrottle):
    """Limite les requêtes soutenues pour les utilisateurs authentifiés."""
    scope = 'sustained'
    rate = '1000/day'
