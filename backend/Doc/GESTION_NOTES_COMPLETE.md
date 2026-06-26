# 📚 Système de Gestion des Notes - Par Acteur

## 🎯 Vue d'ensemble

Système complet de gestion des notes avec workflows spécifiques pour chaque acteur.

---

## 📝 Fichiers modifiés

1. **`apps/evaluation/models.py`** - Modèles enrichis
2. **`apps/evaluation/grade_services.py`** - Services métier (NOUVEAU)
3. **`apps/evaluation/views.py`** - Endpoints API
4. **`apps/evaluation/urls.py`** - Routes

---

## ✨ Améliorations des modèles

### Grade (Note)
**Nouveaux champs** :
- `cc_weight` - Pondération CC (40%)
- `exam_weight` - Pondération Examen (60%)
- `bonus_points` - Points bonus
- `penalty_points` - Pénalités
- `is_rattrapage` - Note de rattrapage
- `appreciation` - Appréciation enseignant
- `published_to_student` - Publié à l'étudiant
- `modification_history` - Historique JSON

**Nouvelles méthodes** :
- `calculate_final_grade()` - Calcul automatique
- `publish_to_student()` - Publication avec notification

### UEResult (Résultat UE)
**Nouveaux champs** :
- `is_capitalized` - UE capitalisée
- `rank_in_ue` - Classement dans l'UE
- `percentile` - Percentile

**Nouvelles méthodes** :
- `calculate_ue_average()` - Calcul moyenne UE
- `calculate_rank()` - Calcul classement

### SemesterResult (Résultat Semestriel)
**Nouveaux champs** :
- `mention` - Mention (Très Bien, Bien, etc.)
- `gpa` - GPA (0-4)
- `percentile` - Percentile
- `ues_validated` - Nombre d'UE validées
- `ues_failed` - Nombre d'UE échouées
- `jury_observations` - Observations du jury

**Nouvelles méthodes** :
- `calculate_semester_average()` - Calcul moyenne semestre
- `calculate_rank()` - Calcul classement
- `publish_results()` - Publication avec notification

---

## 🎭 Fonctionnalités par acteur

### 1. 👨‍🎓 ÉTUDIANT

#### Consulter ses notes
```bash
GET /api/v1/evaluation/student/grades/
GET /api/v1/evaluation/student/grades/?exam_session=<id>
```

**Réponse** :
```json
[
  {
    "id": 1,
    "ec": {"code": "INF301", "name": "Programmation"},
    "cc_grade": 14.5,
    "exam_grade": 12.0,
    "final_grade": 12.9,
    "appreciation": "Bon travail",
    "status": "publiee"
  }
]
```

#### Obtenir son relevé de notes
```bash
GET /api/v1/evaluation/student/transcript/
GET /api/v1/evaluation/student/transcript/?academic_year=<id>
```

**Réponse** :
```json
{
  "student": {...},
  "cumulative_gpa": 3.2,
  "total_credits": 120,
  "semesters": [
    {
      "semester": "Semestre 1",
      "average": 12.5,
      "credits_obtained": 30,
      "decision": "Admis",
      "mention": "Assez Bien",
      "rank": 15,
      "gpa": 2.5,
      "ue_results": [...]
    }
  ]
}
```

#### Soumettre une réclamation
```bash
POST /api/v1/evaluation/student/contest/
{
  "grade_id": 123,
  "reason": "Erreur de calcul dans la note finale"
}
```

---

### 2. 👨‍🏫 ENSEIGNANT

#### Saisir une note
```bash
POST /api/v1/evaluation/teacher/enter-grade/
{
  "student_id": 1,
  "ec_id": 5,
  "exam_session_id": 2,
  "cc_grade": 14.5,
  "exam_grade": 12.0,
  "appreciation": "Bon travail, continuez ainsi",
  "is_absent": false
}
```

#### Consulter ses notes saisies
```bash
GET /api/v1/evaluation/teacher/grades/
GET /api/v1/evaluation/teacher/grades/?ec=<id>&exam_session=<id>
```

#### Statistiques de classe
```bash
GET /api/v1/evaluation/teacher/statistics/?ec=<id>&exam_session=<id>
```

**Réponse** :
```json
{
  "average": 12.5,
  "min_grade": 5.0,
  "max_grade": 18.5,
  "total_students": 45,
  "success_rate": 75.5,
  "absent_count": 3,
  "distribution": {
    "0-5": 2,
    "5-10": 8,
    "10-12": 15,
    "12-14": 12,
    "14-16": 6,
    "16-20": 2
  }
}
```

---

### 3. 👔 RESPONSABLE PÉDAGOGIQUE

#### Valider des notes en masse
```bash
POST /api/v1/evaluation/admin/validate-bulk/
{
  "grade_ids": [1, 2, 3, 4, 5]
}
```

**Réponse** :
```json
{
  "detail": "5 notes validées"
}
```

#### Calculer les résultats d'UE
```bash
POST /api/v1/evaluation/admin/calculate-ue/
{
  "exam_session_id": 2
}
```

**Réponse** :
```json
{
  "detail": "150 résultats d'UE calculés"
}
```

#### Calculer les résultats semestriels
```bash
POST /api/v1/evaluation/admin/calculate-semester/
{
  "exam_session_id": 2
}
```

**Réponse** :
```json
{
  "detail": "50 résultats semestriels calculés"
}
```

---

### 4. 🏛️ ADMIN SCOLARITÉ

#### Publier les résultats
```bash
POST /api/v1/evaluation/admin/publish-results/
{
  "exam_session_id": 2
}
```

**Réponse** :
```json
{
  "detail": "50 résultats publiés"
}
```

**Effet** : Tous les étudiants reçoivent une notification avec leurs résultats.

---

## 🔄 Workflow complet

### Étape 1 : Saisie (ENSEIGNANT)
```python
# L'enseignant saisit les notes
POST /teacher/enter-grade/
{
  "student_id": 1,
  "ec_id": 5,
  "exam_session_id": 2,
  "cc_grade": 14.5,
  "exam_grade": 12.0
}

# Calcul automatique : final_grade = (14.5 * 0.4) + (12.0 * 0.6) = 12.9
```

### Étape 2 : Validation (RESPONSABLE PÉDAGOGIQUE)
```python
# Validation en masse
POST /admin/validate-bulk/
{
  "grade_ids": [1, 2, 3, ...]
}

# Statut passe de "saisie" à "validee"
```

### Étape 3 : Calcul des résultats (RESPONSABLE PÉDAGOGIQUE)
```python
# 1. Calculer les moyennes d'UE
POST /admin/calculate-ue/
{
  "exam_session_id": 2
}

# 2. Calculer les moyennes semestrielles
POST /admin/calculate-semester/
{
  "exam_session_id": 2
}

# Calculs automatiques :
# - Moyenne UE = moyenne pondérée des EC
# - Moyenne semestre = moyenne pondérée des UE
# - GPA = (moyenne / 20) * 4
# - Mention selon la moyenne
# - Classement
```

### Étape 4 : Publication (ADMIN SCOLARITÉ)
```python
# Publier tous les résultats
POST /admin/publish-results/
{
  "exam_session_id": 2
}

# Chaque étudiant reçoit une notification :
# "🎓 Résultats Semestre 1
#  Moyenne: 12.5/20
#  Crédits: 30/30
#  Décision: Admis
#  Mention: Assez Bien
#  Classement: 15/50"
```

### Étape 5 : Consultation (ÉTUDIANT)
```python
# L'étudiant consulte ses notes
GET /student/grades/

# L'étudiant peut soumettre une réclamation
POST /student/contest/
{
  "grade_id": 123,
  "reason": "Erreur de calcul"
}
```

---

## 💡 Exemples d'utilisation

### Exemple 1 : Saisie de notes par un enseignant

```python
from apps.evaluation.grade_services import GradeService
from apps.people.models import Student
from apps.programs.models import EC
from apps.evaluation.models import ExamSession

# Récupérer les données
student = Student.objects.get(student_id='ETU-001')
ec = EC.objects.get(code='INF301')
exam_session = ExamSession.objects.get(id=1)

# Saisir la note
grade = GradeService.enter_grade(
    student=student,
    ec=ec,
    exam_session=exam_session,
    cc_grade=14.5,
    exam_grade=12.0,
    entered_by=teacher.user,
    appreciation="Excellent travail"
)

print(f"Note finale calculée : {grade.final_grade}/20")
# Output: Note finale calculée : 12.9/20
```

### Exemple 2 : Calcul automatique des résultats

```python
from apps.evaluation.grade_services import ResultService
from apps.evaluation.models import ExamSession

exam_session = ExamSession.objects.get(id=1)

# 1. Calculer les résultats d'UE
ue_count = ResultService.calculate_ue_results(exam_session)
print(f"{ue_count} résultats d'UE calculés")

# 2. Calculer les résultats semestriels
sem_count = ResultService.calculate_semester_results(exam_session)
print(f"{sem_count} résultats semestriels calculés")

# 3. Publier les résultats
pub_count = ResultService.publish_semester_results(exam_session)
print(f"{pub_count} résultats publiés")
```

### Exemple 3 : Statistiques de classe

```python
from apps.evaluation.grade_services import GradeService
from apps.programs.models import EC
from apps.evaluation.models import ExamSession

ec = EC.objects.get(code='INF301')
exam_session = ExamSession.objects.get(id=1)

stats = GradeService.calculate_class_statistics(ec, exam_session)

print(f"Moyenne de classe : {stats['average']}/20")
print(f"Taux de réussite : {stats['success_rate']}%")
print(f"Distribution : {stats['distribution']}")
```

---

## 🚀 Installation

```bash
# 1. Créer les migrations
python manage.py makemigrations evaluation

# 2. Appliquer les migrations
python manage.py migrate

# 3. Tester les endpoints
python manage.py runserver
```

---

## 📊 Avantages

### ✅ Automatisation
- Calcul automatique des notes finales
- Calcul automatique des moyennes UE/Semestre
- Calcul automatique des classements
- Notifications automatiques

### ✅ Traçabilité
- Historique des modifications
- Qui a saisi/validé/publié
- Horodatage de toutes les actions

### ✅ Sécurité
- Workflow de validation
- Permissions par acteur
- Réclamations tracées

### ✅ Flexibilité
- Pondérations configurables
- Bonus/Pénalités
- Rattrapage géré
- Capitalisation d'UE

---

## 🎯 Résumé des endpoints

| Acteur | Endpoint | Méthode | Description |
|--------|----------|---------|-------------|
| **ÉTUDIANT** | `/student/grades/` | GET | Consulter ses notes |
| | `/student/transcript/` | GET | Relevé de notes |
| | `/student/contest/` | POST | Réclamation |
| **ENSEIGNANT** | `/teacher/enter-grade/` | POST | Saisir une note |
| | `/teacher/grades/` | GET | Ses notes saisies |
| | `/teacher/statistics/` | GET | Stats de classe |
| **RESPONSABLE** | `/admin/validate-bulk/` | POST | Valider en masse |
| | `/admin/calculate-ue/` | POST | Calculer UE |
| | `/admin/calculate-semester/` | POST | Calculer semestre |
| **ADMIN** | `/admin/publish-results/` | POST | Publier résultats |

---

**Système complet de gestion des notes prêt à l'emploi ! 🎓**
