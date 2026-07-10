"""
Détection anti-plagiat — Compilatio (8.23 / R4).

Sans `PLAGIARISM_API_KEY` configuré, `is_configured()` renvoie False et le
dépôt de mémoire/thèse continue sans blocage (le contrôle anti-plagiat
n'est pas une étape obligatoire du dépôt) — l'appel API réel est prêt, il
ne manque qu'un abonnement Compilatio (ou Turnitin, sur le même principe).
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def is_configured():
    return bool(getattr(settings, 'PLAGIARISM_API_KEY', ''))


def submit_for_analysis(thesis):
    """
    Soumet le fichier final d'un mémoire/thèse à l'analyse anti-plagiat.
    Retourne {'success': bool, 'analysis_id': str | None, 'error': str | None}.
    L'appelant doit interroger `get_analysis_result` plus tard (traitement
    asynchrone côté Compilatio, généralement quelques minutes).
    """
    if not is_configured():
        return {'success': False, 'analysis_id': None, 'error': "Service anti-plagiat non configuré (PLAGIARISM_API_KEY manquant)."}
    if not thesis.final_file:
        return {'success': False, 'analysis_id': None, 'error': 'Aucun fichier final déposé.'}

    try:
        with thesis.final_file.open('rb') as fh:
            response = requests.post(
                f"{settings.PLAGIARISM_API_URL}/v1/documents",
                headers={'Authorization': f'Bearer {settings.PLAGIARISM_API_KEY}'},
                files={'file': (thesis.final_file.name, fh)},
                data={'title': thesis.title},
                timeout=30,
            )
        if response.status_code in (200, 201):
            data = response.json()
            return {'success': True, 'analysis_id': data.get('id'), 'error': None}
        return {'success': False, 'analysis_id': None, 'error': response.text[:300]}
    except requests.RequestException as exc:
        logger.error(f"Erreur soumission anti-plagiat: {exc}")
        return {'success': False, 'analysis_id': None, 'error': str(exc)}


def get_analysis_result(analysis_id):
    """Retourne {'success': bool, 'similarity_percent': float | None, 'report_url': str | None}."""
    if not is_configured():
        return {'success': False, 'similarity_percent': None, 'report_url': None, 'error': 'Service non configuré.'}
    try:
        response = requests.get(
            f"{settings.PLAGIARISM_API_URL}/v1/documents/{analysis_id}",
            headers={'Authorization': f'Bearer {settings.PLAGIARISM_API_KEY}'},
            timeout=15,
        )
        data = response.json()
        return {
            'success': True, 'similarity_percent': data.get('similarity_percent'),
            'report_url': data.get('report_url'), 'error': None,
        }
    except requests.RequestException as exc:
        logger.error(f"Erreur consultation anti-plagiat: {exc}")
        return {'success': False, 'similarity_percent': None, 'report_url': None, 'error': str(exc)}
