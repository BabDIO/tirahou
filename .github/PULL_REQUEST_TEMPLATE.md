# Pull Request

## 📝 Description

Courte description des changements apportés et de leur justification.

Fixes # (numéro de l'issue si applicable)

## 🔧 Type de Changement

Cocher les cases appropriées :

- [ ] 🐛 Bug fix (changement non-breaking qui corrige un problème)
- [ ] ✨ New feature (changement non-breaking qui ajoute une fonctionnalité)
- [ ] 💥 Breaking change (correction ou feature qui changerait le comportement existant)
- [ ] 📚 Documentation update
- [ ] ♻️ Refactoring (amélioration du code sans changer le comportement)
- [ ] 🎨 UI/UX (amélioration de l'interface utilisateur)
- [ ] ⚡ Performance (amélioration des performances)
- [ ] 🧪 Tests (ajout ou modification de tests)

## 🧪 Comment a été Testé ?

Décrire les tests effectués pour vérifier vos changements.

- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests E2E
- [ ] Tests manuels
- [ ] Build de production réussi

**Détails des tests** :
```
Décrire ici comment vous avez testé
```

## 📸 Screenshots (si applicable)

Ajouter des screenshots pour les changements visuels.

### Avant
<!-- Screenshot avant les changements -->

### Après
<!-- Screenshot après les changements -->

## ✅ Checklist

Avant de soumettre votre PR, assurez-vous que :

### Code Quality
- [ ] Mon code suit le style guide du projet
- [ ] J'ai effectué une auto-review de mon code
- [ ] J'ai commenté le code, particulièrement dans les zones complexes
- [ ] Pas de code commenté inutile ou de console.log oubliés
- [ ] Les noms de variables et fonctions sont clairs et explicites

### Documentation
- [ ] J'ai fait les changements correspondants dans la documentation
- [ ] J'ai mis à jour le CHANGELOG.md (si nécessaire)
- [ ] J'ai ajouté des docstrings/commentaires pour les nouvelles fonctions

### Tests
- [ ] J'ai ajouté des tests qui prouvent que ma correction est efficace ou que ma feature fonctionne
- [ ] Les tests unitaires existants passent localement
- [ ] Les nouveaux tests passent localement
- [ ] La couverture de tests n'a pas diminué

### Build & CI
- [ ] Le build de production réussit (`npm run build` ou `python manage.py check`)
- [ ] Mes changements ne génèrent pas de nouveaux warnings
- [ ] Pas d'erreurs TypeScript (frontend)
- [ ] Pas d'erreurs de linting

### Database (si applicable)
- [ ] J'ai créé des migrations Django (si modification de modèles)
- [ ] Les migrations peuvent être appliquées et rollback sans erreur
- [ ] J'ai testé les migrations sur une base de données propre

### API (si applicable)
- [ ] Les endpoints modifiés/nouveaux sont documentés
- [ ] Les permissions sont correctement configurées
- [ ] Les sérialiseurs sont testés
- [ ] La documentation Swagger est à jour

## 🔗 Issues Liées

Lister les issues liées à cette PR :

- Closes #
- Relates to #
- Depends on #

## 📋 Contexte Additionnel

Ajouter tout autre contexte pertinent concernant la PR.

## 🚀 Déploiement

Y a-t-il des étapes spéciales requises pour le déploiement ?

- [ ] Nécessite des migrations de base de données
- [ ] Nécessite des modifications de variables d'environnement
- [ ] Nécessite une mise à jour des dépendances
- [ ] Nécessite des changements de configuration serveur
- [ ] Nécessite une documentation de déploiement

**Instructions de déploiement** :
```bash
# Commandes nécessaires pour le déploiement
```

## 👥 Reviewers

Mentionner les personnes qui devraient reviewer cette PR :

@username

## 📝 Notes pour les Reviewers

Informations importantes pour faciliter la review :

- Points d'attention particuliers
- Zones nécessitant une attention spéciale
- Décisions techniques importantes prises

---

**Merci pour votre contribution ! 🙏**
