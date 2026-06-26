import os
from django.core.wsgi import get_wsgi_application

# Utilise les settings de production si DJANGO_SETTINGS_MODULE est défini,
# sinon fallback sur settings standard
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
