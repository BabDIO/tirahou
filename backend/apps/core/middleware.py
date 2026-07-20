"""Middlewares transverses de l'application (voir aussi apps/core/rls.py)."""
from django.db import connection, transaction


class PostgresRLSTransactionMiddleware:
    """
    Enveloppe chaque requête dans une transaction PostgreSQL, uniquement
    quand le moteur de base de données est PostgreSQL (no-op sur SQLite en
    développement local).

    Nécessaire pour que le contexte positionné par `set_rls_context()`
    (apps/core/rls.py, via `SET LOCAL`) survive du moment de l'authentification
    JWT — qui a lieu à l'intérieur du traitement de la vue DRF — jusqu'à la
    fin de la requête : `SET LOCAL` ne vaut que pour la transaction en
    cours, donc sans cette transaction englobante la variable de session
    serait remise à zéro avant que la vue n'exécute sa propre requête.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if connection.vendor != 'postgresql':
            return self.get_response(request)
        with transaction.atomic():
            return self.get_response(request)
