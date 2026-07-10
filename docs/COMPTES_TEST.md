# 🔐 COMPTES DE TEST - TIRAHOU

## 📍 URLs d'accès

- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:8000
- **API Docs** : http://localhost:8000/api/docs
- **Admin Django** : http://localhost:8000/admin

---

## 👥 COMPTES PAR RÔLE

### 🔐 ADMINISTRATEUR (Accès complet)
```
Email    : admin@tirahou.edu
Password : Admin123!
Rôle     : admin_institutionnel
```
**Permissions :**
- Gestion utilisateurs
- Toutes les fonctionnalités
- Accès admin Django

---

### 👨‍🎓 ÉTUDIANT (Lecture seule)
```
Email    : etudiant@tirahou.edu
Password : Etudiant123!
Rôle     : etudiant
```
**Permissions :**
- Consulter notes
- Voir emploi du temps
- Télécharger documents
- Accéder aux cours
- Consulter finances

**Dashboard :** `/dashboard/student`

---

### 👨‍🏫 ENSEIGNANT (Saisie notes)
```
Email    : enseignant@tirahou.edu
Password : Enseignant123!
Rôle     : enseignant
```
**Permissions :**
- Saisir notes des étudiants
- Gérer cours
- Voir liste étudiants
- Gestion présences

**Dashboard :** `/dashboard/teacher`

---

### 📋 ADMIN SCOLARITÉ (Publication résultats)
```
Email    : scolarite@tirahou.edu
Password : Scolarite123!
Rôle     : admin_scolarite
```
**Permissions :**
- Publier résultats
- Générer documents
- Gérer inscriptions
- Valider notes

**Dashboard :** `/dashboard/scolarite`

---

### 💰 ADMIN FINANCIER (Gestion paiements)
```
Email    : financier@tirahou.edu
Password : Financier123!
Rôle     : admin_financier
```
**Permissions :**
- Valider paiements
- Gérer bourses
- Journal de caisse
- Exports financiers

**Dashboard :** `/dashboard/financier`

---

### 🎓 RESPONSABLE PÉDAGOGIQUE (Validation)
```
Email    : responsable@tirahou.edu
Password : Responsable123!
Rôle     : responsable_pedagogique
```
**Permissions :**
- Valider notes saisies
- Gérer programmes
- Calcul résultats
- Groupes étudiants

**Dashboard :** `/dashboard/responsable`

---

### 📚 BIBLIOTHÉCAIRE (Gestion docs)
```
Email    : bibliothecaire@tirahou.edu
Password : Biblio123!
Rôle     : bibliothecaire
```
**Permissions :**
- Ajouter documents
- Gérer catalogue
- Statistiques emprunts

**Dashboard :** `/dashboard/bibliothecaire`

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Connexion et Dashboards
1. Se connecter avec chaque compte
2. Vérifier que le dashboard affiché correspond au rôle
3. Vérifier les menus accessibles

### Test 2 : Permissions (ÉTUDIANT)
1. Connexion étudiant
2. ✅ Accès à "Mes notes"
3. ❌ Tentative d'accès à "/teacher/grades" → Doit rediriger
4. ✅ Consultation emploi du temps
5. ❌ Pas de bouton "Saisir note"

### Test 3 : Workflow Notes (ENSEIGNANT)
1. Connexion enseignant
2. Aller dans "Saisie des notes"
3. Sélectionner un EC et une session
4. Saisir notes CC et Examen
5. Vérifier calcul automatique note finale
6. Enregistrer

### Test 4 : Validation (RESPONSABLE)
1. Connexion responsable
2. Aller dans "Validation des notes"
3. Voir les notes saisies par l'enseignant
4. Sélectionner et valider

### Test 5 : Publication (SCOLARITÉ)
1. Connexion scolarité
2. Aller dans "Gestion des résultats"
3. Calculer les résultats semestriels
4. Publier les résultats
5. Vérifier côté étudiant

### Test 6 : Recherche Globale
1. N'importe quel compte
2. Appuyer sur Ctrl+K
3. Rechercher "cours", "étudiant", etc.
4. Vérifier les résultats

### Test 7 : Notifications
1. Cliquer sur l'icône cloche
2. Voir les notifications
3. Marquer comme lu
4. Supprimer

### Test 8 : Mode Sombre
1. Cliquer sur l'icône soleil/lune
2. Vérifier le changement de thème
3. Vérifier la persistance (refresh)

---

## 📊 CHECKLIST DE TESTS

- [ ] Connexion admin fonctionne
- [ ] Connexion étudiant fonctionne
- [ ] Connexion enseignant fonctionne
- [ ] Dashboards différents par rôle
- [ ] Permissions respectées (étudiant ne peut pas saisir notes)
- [ ] Saisie notes (enseignant)
- [ ] Validation notes (responsable)
- [ ] Publication résultats (scolarité)
- [ ] Recherche globale Ctrl+K
- [ ] Notifications temps réel
- [ ] Mode sombre/clair
- [ ] Export CSV fonctionne
- [ ] Graphiques s'affichent
- [ ] DataTable avec tri/recherche
- [ ] Responsive mobile

---

## 🐛 BUGS À SIGNALER

Si vous trouvez des bugs pendant les tests, notez :
- Compte utilisé
- Page concernée
- Action effectuée
- Erreur affichée (console)

---

**Document créé le** : Juillet 2026
**Version** : 1.3.0
**Statut** : ✅ PRÊT POUR TESTS
