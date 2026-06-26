# 📚 Système de Bibliothèque Amélioré

## 🎯 Vue d'ensemble

Système complet de gestion de bibliothèque avec emprunts, réservations, évaluations et recommandations.

---

## ✨ Améliorations apportées

### 1. **Modèle LibraryDocument enrichi**

**Nouveaux champs** :
- `status` - Statut (disponible, emprunté, réservé, maintenance, perdu)
- `quantity` - Nombre d'exemplaires
- `available_quantity` - Exemplaires disponibles
- `location` - Emplacement physique (rayon, étagère)
- `publisher` - Maison d'édition
- `edition` - Édition
- `pages` - Nombre de pages
- `language` - Langue
- `rating` - Note moyenne (0-5)
- `rating_count` - Nombre d'évaluations
- `tags` - Tags pour recherche
- `related_courses` - Cours liés

**Nouvelles méthodes** :
- `update_rating()` - Mise à jour note moyenne
- `is_available()` - Vérifier disponibilité
- `borrow()` - Emprunter un exemplaire
- `return_copy()` - Retourner un exemplaire

### 2. **Nouveau modèle : Borrowing (Emprunt)**

```python
{
  "document": LibraryDocument,
  "borrower": User,
  "borrowed_at": DateTime,
  "due_date": Date,
  "returned_at": DateTime,
  "status": "en_cours|retourne|en_retard|perdu",
  "late_days": 0,
  "penalty_amount": 0,  # 500 FCFA/jour
  "penalty_paid": false
}
```

**Méthode** :
- `calculate_penalty()` - Calcul automatique des pénalités

### 3. **Nouveau modèle : Reservation (Réservation)**

```python
{
  "document": LibraryDocument,
  "user": User,
  "reserved_at": DateTime,
  "status": "en_attente|disponible|recupere|annule|expire",
  "position": 1,  # Position dans la file
  "notified": false
}
```

### 4. **Nouveau modèle : DocumentRating (Évaluation)**

```python
{
  "document": LibraryDocument,
  "user": User,
  "rating": 5,  # 1-5 étoiles
  "comment": "Excellent livre !"
}
```

### 5. **Nouveau modèle : ReadingList (Liste de lecture)**

```python
{
  "user": User,
  "name": "Ma liste de lecture",
  "description": "Livres à lire cet été",
  "documents": [doc1, doc2, ...],
  "is_public": false
}
```

---

## 📡 Nouveaux endpoints

### 1. Emprunter un document
```bash
POST /api/v1/library/documents/{id}/borrow/
```

**Réponse** :
```json
{
  "id": 123,
  "due_date": "2024-05-01",
  "message": "Emprunt enregistré avec succès"
}
```

### 2. Réserver un document
```bash
POST /api/v1/library/documents/{id}/reserve/
```

**Réponse** :
```json
{
  "id": 456,
  "position": 3,
  "message": "Réservation enregistrée. Position dans la file: 3"
}
```

### 3. Noter un document
```bash
POST /api/v1/library/documents/{id}/rate/
{
  "rating": 5,
  "comment": "Excellent livre, très instructif"
}
```

**Réponse** :
```json
{
  "message": "Évaluation enregistrée",
  "average_rating": 4.5,
  "rating_count": 12
}
```

### 4. Mes emprunts en cours
```bash
GET /api/v1/library/documents/my_borrowings/
```

**Réponse** :
```json
[
  {
    "id": 123,
    "document": {
      "id": 1,
      "title": "Introduction à Python",
      "author": "John Doe",
      "cover": "/media/library/covers/python.jpg"
    },
    "borrowed_at": "2024-04-01T10:00:00Z",
    "due_date": "2024-04-15",
    "late_days": 2,
    "penalty_amount": 1000,
    "status": "en_retard"
  }
]
```

### 5. Mes réservations
```bash
GET /api/v1/library/documents/my_reservations/
```

### 6. Recommandations personnalisées
```bash
GET /api/v1/library/documents/recommendations/
```

Basé sur :
- Emprunts précédents
- Domaines d'intérêt
- Notes données

### 7. Documents populaires
```bash
GET /api/v1/library/documents/popular/
```

Triés par :
- Nombre de téléchargements
- Nombre de vues
- Note moyenne

### 8. Documents récents
```bash
GET /api/v1/library/documents/recent/
```

---

## 🔄 Workflow d'emprunt

### Étape 1 : Recherche
```bash
GET /api/v1/library/documents/?search=python&type=livre
```

### Étape 2 : Vérifier disponibilité
```json
{
  "status": "disponible",
  "available_quantity": 3,
  "quantity": 5
}
```

### Étape 3 : Emprunter
```bash
POST /api/v1/library/documents/1/borrow/
```

**Effet** :
- `available_quantity` passe de 3 à 2
- Création d'un `Borrowing` avec `due_date` = aujourd'hui + 14 jours
- Notification envoyée à l'utilisateur

### Étape 4 : Retour (par le bibliothécaire)
```python
borrowing = Borrowing.objects.get(id=123)
borrowing.status = 'retourne'
borrowing.returned_at = timezone.now()
borrowing.save()

# Remettre l'exemplaire disponible
borrowing.document.return_copy()
```

---

## 🔄 Workflow de réservation

### Cas : Document non disponible

```bash
# 1. Vérifier disponibilité
GET /api/v1/library/documents/1/
# Réponse: "available_quantity": 0

# 2. Réserver
POST /api/v1/library/documents/1/reserve/
# Réponse: "position": 3

# 3. Quand un exemplaire est retourné
# Le système notifie automatiquement le premier dans la file
```

---

## 💰 Système de pénalités

### Calcul automatique

```python
# Durée d'emprunt : 14 jours
# Pénalité : 500 FCFA par jour de retard

# Exemple :
# Date d'emprunt : 01/04/2024
# Date de retour prévue : 15/04/2024
# Date actuelle : 17/04/2024
# Retard : 2 jours
# Pénalité : 2 × 500 = 1000 FCFA
```

### Vérification automatique

```python
borrowing.calculate_penalty()
# Met à jour automatiquement :
# - late_days
# - penalty_amount
# - status (passe à 'en_retard')
```

---

## ⭐ Système d'évaluation

### Noter un document

```bash
POST /api/v1/library/documents/1/rate/
{
  "rating": 5,
  "comment": "Excellent livre"
}
```

### Mise à jour automatique

```python
# Après chaque évaluation :
# 1. Calcul de la moyenne
# 2. Mise à jour de document.rating
# 3. Incrémentation de document.rating_count
```

---

## 🎯 Recommandations personnalisées

### Algorithme

```python
# 1. Récupérer les domaines des emprunts précédents
user_domains = user.borrowings.values_list('document__domain', flat=True)

# 2. Trouver des documents similaires
recommendations = LibraryDocument.objects.filter(
    domain__in=user_domains,
    status='disponible'
).exclude(
    borrowings__borrower=user  # Exclure déjà empruntés
).order_by('-rating', '-download_count')[:10]
```

---

## 📊 Statistiques enrichies

```bash
GET /api/v1/library/documents/stats/
```

**Réponse** :
```json
{
  "total": 1250,
  "livres": 800,
  "memoires": 200,
  "theses": 150,
  "articles": 100,
  "total_downloads": 15000,
  "by_domain": [
    {"domain": "Informatique", "count": 350},
    {"domain": "Mathématiques", "count": 200},
    {"domain": "Physique", "count": 150}
  ],
  "total_borrowings": 500,
  "active_borrowings": 120,
  "overdue_borrowings": 15,
  "total_reservations": 45
}
```

---

## 🚀 Installation

```bash
# 1. Créer les migrations
python manage.py makemigrations library

# 2. Appliquer les migrations
python manage.py migrate

# 3. Tester
python manage.py runserver
```

---

## 💡 Exemples d'utilisation

### Exemple 1 : Emprunter un livre

```python
from apps.library.models import LibraryDocument, Borrowing
from apps.accounts.models import User
from datetime import timedelta
from django.utils import timezone

# Récupérer le document
document = LibraryDocument.objects.get(id=1)

# Vérifier disponibilité
if document.is_available():
    # Créer l'emprunt
    borrowing = Borrowing.objects.create(
        document=document,
        borrower=user,
        due_date=timezone.now().date() + timedelta(days=14)
    )
    
    # Mettre à jour la disponibilité
    document.borrow()
    
    print(f"Emprunt créé. Retour prévu: {borrowing.due_date}")
else:
    print("Document non disponible")
```

### Exemple 2 : Calculer les pénalités

```python
from apps.library.models import Borrowing

# Récupérer tous les emprunts en cours
borrowings = Borrowing.objects.filter(status='en_cours')

total_penalties = 0
for borrowing in borrowings:
    penalty = borrowing.calculate_penalty()
    if penalty > 0:
        print(f"{borrowing.borrower.get_full_name()}: {penalty} FCFA")
        total_penalties += penalty

print(f"Total pénalités: {total_penalties} FCFA")
```

### Exemple 3 : Recommandations

```python
from apps.library.models import LibraryDocument, Borrowing

# Domaines d'intérêt de l'utilisateur
user_domains = Borrowing.objects.filter(
    borrower=user
).values_list('document__domain', flat=True).distinct()

# Recommandations
recommendations = LibraryDocument.objects.filter(
    domain__in=user_domains,
    status='disponible',
    rating__gte=4.0
).order_by('-rating')[:10]

for doc in recommendations:
    print(f"{doc.title} - {doc.rating}/5 ⭐")
```

---

## 🎨 Interface utilisateur suggérée

### Page d'accueil bibliothèque
- 🔍 Barre de recherche
- 📚 Documents en vedette
- 🔥 Documents populaires
- 🆕 Nouveautés
- 💡 Recommandations personnalisées

### Page détail document
- 📖 Informations complètes
- ⭐ Note moyenne et évaluations
- 📊 Disponibilité (X/Y exemplaires)
- 🔘 Bouton "Emprunter" ou "Réserver"
- 💬 Commentaires des lecteurs

### Mon compte
- 📚 Mes emprunts en cours
- ⏰ Dates de retour
- 💰 Pénalités à payer
- 🔖 Mes réservations
- 📋 Mes listes de lecture

---

## ✅ Avantages

### Pour les étudiants
- ✅ Emprunts en ligne
- ✅ Réservations automatiques
- ✅ Recommandations personnalisées
- ✅ Suivi des emprunts
- ✅ Évaluations et commentaires

### Pour les bibliothécaires
- ✅ Gestion automatisée
- ✅ Calcul automatique des pénalités
- ✅ Suivi des retards
- ✅ Statistiques détaillées
- ✅ Gestion des réservations

### Pour l'administration
- ✅ Statistiques d'utilisation
- ✅ Rapports automatiques
- ✅ Optimisation des acquisitions
- ✅ Traçabilité complète

---

**Système de bibliothèque moderne et complet ! 📚✨**
