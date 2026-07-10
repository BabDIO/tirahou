from pathlib import Path
from datetime import timedelta
import os
import logging

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Sécurité ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-gma6xmi@$7k#v72k2u=s0l*$vo$@54)#8xz-ba9y6o+i+sr58f'
)
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    # Apps TIRAHOU
    'apps.core',
    'apps.accounts',
    'apps.academic',
    'apps.programs',
    'apps.people',
    'apps.admissions',
    'apps.enrollment',
    'apps.finance',
    'apps.documents',
    'apps.evaluation',
    'apps.lms',
    'apps.virtual_class',
    'apps.attendance',
    'apps.scheduling_app',
    'apps.internships',
    'apps.communication',
    'apps.analytics_app',
    'apps.api',
    'apps.library',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Base de données ───────────────────────────────────────────────────────────
if os.environ.get('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': 60,
            'OPTIONS': {'connect_timeout': 10},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'accounts.User'

# Backend d'authentification personnalisé (connexion par email)
AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.EmailBackend',  # Authentification par email
    'django.contrib.auth.backends.ModelBackend',  # Fallback sur username
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Abidjan'
USE_I18N = True
USE_TZ = True

# ── Fichiers statiques & media ────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Cache Redis ───────────────────────────────────────────────────────────────
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'tirahou-cache',
    }
}

# Activer Redis si disponible
try:
    import redis as redis_lib
    r = redis_lib.from_url(REDIS_URL)
    r.ping()
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'tirahou',
            'TIMEOUT': 300,
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
except Exception:
    pass

# ── DRF ──────────────────────────────────────────────────────────────────────
# En développement, seuil login plus haut pour tests multi-rôles / démo (sinon 429 après ~5 comptes / IP).
_LOGIN_THROTTLE = '120/minute' if DEBUG else '5/minute'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '200/minute',
        'login': _LOGIN_THROTTLE,
    },
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}

# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME_HOURS', 8))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:5173'
).split(',')
CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

# ── Swagger ───────────────────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'TIRAHOU API',
    'DESCRIPTION': '''
## Plateforme Intégrée de Gestion Universitaire TIRAHOU

API REST complète couvrant :
- Gestion académique LMD (programmes, UE, EC, maquettes)
- Inscriptions administratives et pédagogiques
- Finance et paiements
- LMS / Campus virtuel
- Classes virtuelles hybrides
- Évaluations et notes
- Analytics et reporting

**Authentification** : Bearer JWT Token
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'ENUM_GENERATE_CHOICE_DESCRIPTION': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
    },
    'ENUM_NAME_OVERRIDES': {
        'ProgramTypeEnum': 'apps.programs.models.Program.TYPE_CHOICES',
        'ProgramModeEnum': 'apps.programs.models.Program.MODE_CHOICES',
        'ProgramStatusEnum': 'apps.programs.models.Program.STATUS_CHOICES',
        'StudentStatusEnum': 'apps.people.models.Student.STATUS_CHOICES',
        'ApplicationStatusEnum': 'apps.admissions.models.Application.STATUS_CHOICES',
        'EnrollmentStatusEnum': 'apps.enrollment.models.AdminEnrollment.STATUS_CHOICES',
        'InvoiceStatusEnum': 'apps.finance.models.Invoice.STATUS_CHOICES',
        'GradeStatusEnum': 'apps.evaluation.models.Grade.STATUS_CHOICES',
        'SessionModeEnum': 'apps.scheduling_app.models.ScheduledSession.MODE_CHOICES',
        'SessionStatusEnum': 'apps.scheduling_app.models.ScheduledSession.STATUS_CHOICES',
    },
}

# ── Email ─────────────────────────────────────────────────────────────────────
if os.environ.get('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'TIRAHOU <noreply@tirahou.edu>')

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'tirahou.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Créer le dossier logs si nécessaire
(BASE_DIR / 'logs').mkdir(exist_ok=True)

# ── Notifications push web (VAPID) ────────────────────────────────────────────
# Clés générées pour le développement — à régénérer en production via
# `python -c "from py_vapid import Vapid02; v=Vapid02(); v.generate_keys()"`
# et fournir via variables d'environnement.
VAPID_PUBLIC_KEY = os.environ.get(
    'VAPID_PUBLIC_KEY',
    'BG5qpVoWgZos6X7yVKl6dFuhgudFf4iIGPc-AfOazO7hj289zd0zmuC7hppxL1H2T1wqvzjbHk1hAnItMnxUlo8'
)
VAPID_PRIVATE_KEY = os.environ.get(
    'VAPID_PRIVATE_KEY',
    '-----BEGIN PRIVATE KEY-----\n'
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQghQZuqIqkWAue+xHW\n'
    'qNxhxOLrluOnoU8ureILQ+BpG7+hRANCAARuaqVaFoGaLOl+8lSpenRboYLnRX+I\n'
    'iBj3PgHzmszu4Y9vPc3dM5rgu4aacS9R9k9cKr842x5NYQJyLTJ8VJaP\n'
    '-----END PRIVATE KEY-----\n'
)
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@tirahou.edu')

# ── Intégrations nécessitant des identifiants externes (non fournis) ─────────
# Chaque intégration est un adaptateur fonctionnel : il suffit de renseigner
# les variables d'environnement correspondantes pour l'activer en production.

# Paiement mobile money — CinetPay (apps/finance/payment_gateway.py)
CINETPAY_API_KEY = os.environ.get('CINETPAY_API_KEY', '')
CINETPAY_SITE_ID = os.environ.get('CINETPAY_SITE_ID', '')
CINETPAY_NOTIFY_URL = os.environ.get('CINETPAY_NOTIFY_URL', '')
CINETPAY_RETURN_URL = os.environ.get('CINETPAY_RETURN_URL', '')

# Visioconférence — BigBlueButton (apps/virtual_class/bbb.py)
BBB_SERVER_URL = os.environ.get('BBB_SERVER_URL', '')
BBB_SECRET = os.environ.get('BBB_SECRET', '')

# SMS — Twilio (apps/communication/sms.py)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '')

# Anti-plagiat — Compilatio (apps/internships/plagiarism.py)
PLAGIARISM_API_KEY = os.environ.get('PLAGIARISM_API_KEY', '')
PLAGIARISM_API_URL = os.environ.get('PLAGIARISM_API_URL', 'https://api.compilatio.net')

# SSO / Annuaire externe — LDAP (nécessite `pip install django-auth-ldap`)
LDAP_SERVER_URI = os.environ.get('LDAP_SERVER_URI', '')
LDAP_BIND_DN = os.environ.get('LDAP_BIND_DN', '')
LDAP_BIND_PASSWORD = os.environ.get('LDAP_BIND_PASSWORD', '')
LDAP_USER_SEARCH_BASE = os.environ.get('LDAP_USER_SEARCH_BASE', '')
if LDAP_SERVER_URI:
    try:
        import ldap
        from django_auth_ldap.config import LDAPSearch

        AUTH_LDAP_SERVER_URI = LDAP_SERVER_URI
        AUTH_LDAP_BIND_DN = LDAP_BIND_DN
        AUTH_LDAP_BIND_PASSWORD = LDAP_BIND_PASSWORD
        AUTH_LDAP_USER_SEARCH = LDAPSearch(LDAP_USER_SEARCH_BASE, ldap.SCOPE_SUBTREE, '(mail=%(user)s)')
        AUTH_LDAP_USER_ATTR_MAP = {'first_name': 'givenName', 'last_name': 'sn', 'email': 'mail'}
        AUTHENTICATION_BACKENDS = ['django_auth_ldap.backend.LDAPBackend'] + list(AUTHENTICATION_BACKENDS)
    except ImportError:
        logging.getLogger(__name__).warning(
            "LDAP_SERVER_URI défini mais django-auth-ldap n'est pas installé "
            "(pip install django-auth-ldap) — authentification LDAP désactivée."
        )

# ── Sécurité production ───────────────────────────────────────────────────────
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
