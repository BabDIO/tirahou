import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError

logger = logging.getLogger('apps')


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions centralisé — retourne des erreurs cohérentes.
    Format: { "error": "code", "message": "...", "details": {...} }
    """
    response = exception_handler(exc, context)

    if response is not None:
        view = context.get('view', None)
        view_name = view.__class__.__name__ if view else 'Unknown'

        error_data = {
            'error': _get_error_code(response.status_code),
            'message': _extract_message(response.data),
            'status_code': response.status_code,
        }

        if isinstance(response.data, dict) and len(response.data) > 1:
            error_data['details'] = response.data

        logger.warning(
            f"API Error [{response.status_code}] in {view_name}: {error_data['message']}"
        )

        response.data = error_data
        return response

    # Erreurs non gérées par DRF
    if isinstance(exc, DjangoValidationError):
        return Response(
            {'error': 'validation_error', 'message': str(exc), 'status_code': 400},
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, IntegrityError):
        return Response(
            {'error': 'integrity_error', 'message': 'Conflit de données — cet enregistrement existe déjà.', 'status_code': 409},
            status=status.HTTP_409_CONFLICT
        )

    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return None


def _get_error_code(status_code: int) -> str:
    codes = {
        400: 'bad_request',
        401: 'unauthorized',
        403: 'forbidden',
        404: 'not_found',
        405: 'method_not_allowed',
        409: 'conflict',
        429: 'rate_limit_exceeded',
        500: 'internal_server_error',
    }
    return codes.get(status_code, 'error')


def _extract_message(data) -> str:
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        if 'non_field_errors' in data:
            return str(data['non_field_errors'][0])
        first_key = next(iter(data), None)
        if first_key:
            val = data[first_key]
            return f"{first_key}: {val[0] if isinstance(val, list) else val}"
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)
