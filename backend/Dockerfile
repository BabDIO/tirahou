# Dockerfile de DÉVELOPPEMENT LOCAL uniquement — sans lien avec le
# déploiement de production (Render utilise Procfile + build.sh, pas ce
# fichier). Voir docker-compose.yml à la racine du dépôt.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# psycopg2-binary évite d'avoir besoin des headers postgres (libpq-dev) ici.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
