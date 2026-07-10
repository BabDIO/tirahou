"""
Intégration BigBlueButton réelle (8.17 / I3).

Implémente le protocole officiel BBB (checksum SHA-1 sur les paramètres +
secret partagé). Sans `BBB_SERVER_URL`/`BBB_SECRET` configurés,
`is_configured()` renvoie False et l'appelant doit se rabattre sur un lien
statique de démonstration — le code d'appel réel est prêt, il ne manque
qu'un serveur BBB (auto-hébergé ou loué chez un fournisseur type Scalelite).
"""
import hashlib
import logging
import urllib.parse
import xml.etree.ElementTree as ET

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def is_configured():
    return bool(getattr(settings, 'BBB_SERVER_URL', '') and getattr(settings, 'BBB_SECRET', ''))


def _checksum_url(action, params):
    query = urllib.parse.urlencode(params)
    checksum = hashlib.sha1((action + query + settings.BBB_SECRET).encode()).hexdigest()
    base = settings.BBB_SERVER_URL.rstrip('/')
    return f"{base}/bigbluebutton/api/{action}?{query}&checksum={checksum}"


def create_meeting(session):
    """Crée (ou récupère si déjà créée) la réunion BBB pour une VirtualClassSession."""
    if not is_configured():
        return {'success': False, 'error': 'BBB non configuré (BBB_SERVER_URL/BBB_SECRET manquants).'}

    params = {
        'meetingID': str(session.id),
        'name': session.title,
        'attendeePW': session.attendee_password or 'attendee',
        'moderatorPW': session.moderator_password or 'moderator',
        'record': 'true' if session.is_recorded else 'false',
        'duration': int((session.scheduled_end - session.scheduled_start).total_seconds() // 60),
    }
    try:
        response = requests.get(_checksum_url('create', params), timeout=10)
        root = ET.fromstring(response.content)
        if root.findtext('returncode') == 'SUCCESS':
            return {'success': True, 'meeting_id': root.findtext('meetingID')}
        return {'success': False, 'error': root.findtext('message', 'Échec création réunion BBB')}
    except (requests.RequestException, ET.ParseError) as exc:
        logger.error(f"Erreur BBB create: {exc}")
        return {'success': False, 'error': str(exc)}


def get_join_url(session, user, is_moderator=False):
    """Construit l'URL de connexion signée pour un participant donné."""
    if not is_configured():
        return None
    params = {
        'meetingID': str(session.id),
        'fullName': user.get_full_name(),
        'password': (session.moderator_password if is_moderator else session.attendee_password) or ('moderator' if is_moderator else 'attendee'),
        'userID': str(user.id),
    }
    return _checksum_url('join', params)


def end_meeting(session):
    if not is_configured():
        return {'success': False, 'error': 'BBB non configuré.'}
    params = {'meetingID': str(session.id), 'password': session.moderator_password or 'moderator'}
    try:
        response = requests.get(_checksum_url('end', params), timeout=10)
        root = ET.fromstring(response.content)
        return {'success': root.findtext('returncode') == 'SUCCESS'}
    except (requests.RequestException, ET.ParseError) as exc:
        logger.error(f"Erreur BBB end: {exc}")
        return {'success': False, 'error': str(exc)}
