"""
Intégration paiement mobile money (8.12 / E7).

Adaptateur CinetPay (agrégateur utilisé en Côte d'Ivoire pour Orange Money,
MTN Mobile Money, Moov Money, Wave). Aucune fausse simulation : sans
`CINETPAY_API_KEY`/`CINETPAY_SITE_ID` configurés, `is_configured()` renvoie
False et l'appelant doit proposer un paiement en caisse à la place — le
code de l'appel API réel est prêt, il ne manque que les identifiants
marchands (à obtenir sur https://cinetpay.com).
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

CINETPAY_INIT_URL = 'https://api-checkout.cinetpay.com/v2/payment'
CINETPAY_VERIFY_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'


def is_configured():
    return bool(getattr(settings, 'CINETPAY_API_KEY', '') and getattr(settings, 'CINETPAY_SITE_ID', ''))


def initiate_mobile_money_payment(invoice, amount, phone, operator='OM', return_url=''):
    """
    Démarre une transaction mobile money. Retourne un dict
    {'success': bool, 'payment_url': str | None, 'transaction_id': str | None, 'error': str | None}.
    `operator` : 'OM' (Orange Money), 'MOMO' (MTN), 'MOOV', 'WAVE'.
    """
    if not is_configured():
        return {
            'success': False, 'payment_url': None, 'transaction_id': None,
            'error': "Passerelle mobile money non configurée (CINETPAY_API_KEY/CINETPAY_SITE_ID manquants).",
        }

    transaction_id = f"TIRAHOU-{invoice.invoice_number}-{invoice.payments.count() + 1}"
    payload = {
        'apikey': settings.CINETPAY_API_KEY,
        'site_id': settings.CINETPAY_SITE_ID,
        'transaction_id': transaction_id,
        'amount': int(amount),
        'currency': 'XOF',
        'description': f"Paiement facture {invoice.invoice_number} — TIRAHOU",
        'customer_phone_number': phone,
        'channels': operator,
        'notify_url': getattr(settings, 'CINETPAY_NOTIFY_URL', ''),
        'return_url': return_url or getattr(settings, 'CINETPAY_RETURN_URL', ''),
    }
    try:
        response = requests.post(CINETPAY_INIT_URL, json=payload, timeout=10)
        data = response.json()
        if data.get('code') == '201':
            return {
                'success': True, 'transaction_id': transaction_id,
                'payment_url': data['data']['payment_url'], 'error': None,
            }
        return {'success': False, 'payment_url': None, 'transaction_id': transaction_id, 'error': data.get('message', 'Échec CinetPay')}
    except requests.RequestException as exc:
        logger.error(f"Erreur CinetPay initiate: {exc}")
        return {'success': False, 'payment_url': None, 'transaction_id': transaction_id, 'error': str(exc)}


def verify_transaction(transaction_id):
    """Vérifie le statut réel d'une transaction (à appeler depuis le webhook de notification)."""
    if not is_configured():
        return {'success': False, 'status': None, 'error': 'Passerelle non configurée.'}
    try:
        response = requests.post(CINETPAY_VERIFY_URL, json={
            'apikey': settings.CINETPAY_API_KEY,
            'site_id': settings.CINETPAY_SITE_ID,
            'transaction_id': transaction_id,
        }, timeout=10)
        data = response.json()
        status = data.get('data', {}).get('status')
        return {'success': status == 'ACCEPTED', 'status': status, 'error': None if status else data.get('message')}
    except requests.RequestException as exc:
        logger.error(f"Erreur CinetPay verify: {exc}")
        return {'success': False, 'status': None, 'error': str(exc)}
