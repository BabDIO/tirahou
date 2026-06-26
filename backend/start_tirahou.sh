#!/bin/bash

echo "🚀 Démarrage de la plateforme TIRAHOU"
echo "======================================"

# Vérifier l'environnement virtuel
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Activation de l'environnement virtuel..."
    source .venv/bin/activate
fi

# Appliquer les migrations si nécessaire
echo "📦 Vérification des migrations..."
python manage.py migrate --check 2>/dev/null || {
    echo "🔄 Application des migrations..."
    python manage.py migrate
}

# Créer un superutilisateur si nécessaire
echo "👤 Vérification du superutilisateur..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@tirahou.edu', 'admin123')
    print('✅ Superutilisateur créé: admin / admin123')
else:
    print('✅ Superutilisateur existe déjà')
" 2>/dev/null

echo ""
echo "🎯 Plateforme TIRAHOU prête !"
echo "📍 Accès :"
echo "   - Backend: http://localhost:8000"
echo "   - Admin: http://localhost:8000/admin"
echo "   - API Docs: http://localhost:8000/api/schema/swagger-ui/"
echo ""
echo "🔑 Comptes de test :"
echo "   - Admin: admin / admin123"
echo ""

# Démarrer le serveur
echo "🚀 Démarrage du serveur Django..."
python manage.py runserver