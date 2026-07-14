import os
from django.core.wsgi import get_wsgi_application

# wsgi.py n'est utilisé que par le serveur d'application (gunicorn) en
# production -- le développement local passe par manage.py (qui défaut sur
# config.settings). Si DJANGO_SETTINGS_MODULE n'est pas déjà positionné dans
# l'environnement (ex. commande de démarrage du dashboard Render sans le
# préfixe attendu), on doit tomber sur des settings sûrs (DEBUG=False) plutôt
# que sur les settings de dev.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_production')

application = get_wsgi_application()
