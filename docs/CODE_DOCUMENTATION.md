# 📚 DOCUMENTATION TECHNIQUE DU CODE - TIRAHOU
## Plateforme de Gestion Universitaire

**Date** : Juillet 2026  
**Version** : 1.2.0  
**Auteur** : TIRAHOU

---

## 📋 TABLE DES MATIÈRES

1. [Architecture Globale](#architecture-globale)
2. [Module Évaluation](#module-évaluation)
3. [Module Classes Virtuelles](#module-classes-virtuelles)
4. [Module People (Gestion des Acteurs)](#module-people)
5. [Standards de Code](#standards-de-code)
6. [Conventions de Nommage](#conventions-de-nommage)

---

## 🏗️ ARCHITECTURE GLOBALE

### Stack Technique

**Backend**
- **Python** 3.10+
- **Django** 5.2 (Framework web)
- **Django REST Framework** 3.14+ (API REST)
- **PostgreSQL** 14+ (Base de données)
- **Celery** 5.x (Tâches asynchrones)
- **Redis** 7.x (Cache + Message Broker)

**Frontend**
- **React** 19.0 (Framework UI)
- **TypeScript** 5.x (Langage typé)
- **Vite** 5.x (Build tool)
- **TanStack Query** 5.x (Data fetching)
- **TailwindCSS** 3.4 (Styling)
- **Zustand** 4.x (State management)

### Structure des Dossiers

```
memoire/
├── backend/                    # Django Backend
│   ├── apps/                  # Applications Django modulaires
│   │   ├── evaluation/        # 🎯 Gestion notes et résultats
│   │   ├── virtual_class/     # 🎥 Classes virtuelles
│   │   ├── people/            # 👥 Étudiants, enseignants
│   │   ├── academic/          # 📚 Structure académique
│   │   ├── finance/           # 💰 Paiements et bourses
│   │   └── ...                # Autres modules
│   ├── config/                # Configuration Django
│   │   ├── settings.py        # Paramètres globaux
│   │   ├── urls.py            # Routes API
│   │   └── celery.py          # Config Celery
│   └── requirements.txt       # Dépendances Python
│
└── frontend/                   # React Frontend
    ├── src/
    │   ├── pages/             # Pages de l'application
    │   │   ├── teacher/       # Pages enseignants
    │   │   ├── student/       # Pages étudiants
    │   │   └── admin/         # Pages administrateurs
    │   ├── components/        # Composants réutilisables
    │   │   ├── ui/            # Composants UI de base
    │   │   └── evaluation/    # Composants d'évaluation
    │   ├── lib/               # Utilitaires
    │   │   ├── axios.ts       # Client HTTP configuré
    │   │   └── utils.ts       # Fonctions utilitaires
    │   ├── hooks/             # Custom React Hooks
    │   └── types/             # Définitions TypeScript
    └── package.json           # Dépendances NPM
```

---

## 📊 MODULE ÉVALUATION

### Vue d'ensemble

Le module `evaluation` gère l'intégralité du processus d'évaluation LMD :
- ✅ Saisie et validation des notes
- ✅ Calcul automatique des moyennes pondérées
- ✅ Gestion des sessions d'examen (normale + rattrapage)
- ✅ Système de compensation et capitalisation
- ✅ Publication contrôlée avec notifications
- ✅ Réclamations et contestations
- ✅ Génération de relevés et PV

### Modèles de Données

#### 1. Grade (Note)

**Responsabilité** : Représente une note individuelle d'un étudiant pour un EC.

**Champs principaux** :
```python
class Grade(BaseModel):
    student = ForeignKey(Student)          # Étudiant évalué
    ec = ForeignKey(EC)                    # Matière (Élément Constitutif)
    exam_session = ForeignKey(ExamSession) # Session d'examen
    
    # Notes brutes
    cc_grade = DecimalField()              # Contrôle Continu (0-20)
    exam_grade = DecimalField()            # Examen final (0-20)
    final_grade = DecimalField()           # Note finale calculée
    
    # Pondérations
    cc_weight = DecimalField(default=0.4)  # Poids CC (40% par défaut)
    exam_weight = DecimalField(default=0.6)# Poids Examen (60%)
    
    # Modifications
    bonus_points = DecimalField()          # Points bonus
    penalty_points = DecimalField()        # Pénalités
    
    # Workflow
    status = CharField()                   # saisie|validee|publiee|contestee
    is_absent = BooleanField()             # Absence à l'examen
    
    # Métadonnées
    entered_by = ForeignKey(User)          # Qui a saisi
    validated_by = ForeignKey(User)        # Qui a validé
    appreciation = TextField()             # Commentaire enseignant
    modification_history = JSONField()     # Historique complet
```

**Méthodes principales** :

```python
def calculate_final_grade(self):
    """
    Calcule la note finale selon la formule LMD.
    
    Formule : 
        final = (CC × cc_weight) + (Exam × exam_weight) + bonus - penalty
        
    Cas particuliers :
        - Absent : final = 0
        - Limite : 0 ≤ final ≤ 20
        
    Returns:
        Decimal: Note finale calculée
    """
    if self.is_absent:
        return 0
    
    base = (self.cc_grade * self.cc_weight) + (self.exam_grade * self.exam_weight)
    final = base + self.bonus_points - self.penalty_points
    return max(0, min(20, final))

def publish_to_student(self):
    """
    Publie la note à l'étudiant et envoie notification.
    
    Actions :
        1. Marque published_to_student = True
        2. Change status = 'publiee'
        3. Enregistre published_at = now()
        4. Crée notification pour l'étudiant
    """
    self.published_to_student = True
    self.status = 'publiee'
    self.published_at = timezone.now()
    self.save()
    
    # Notification
    Notification.objects.create(
        recipient=self.student.user,
        title=f"Nouvelle note - {self.ec.code}",
        message=f"Note : {self.final_grade}/20"
    )
```

**Workflow d'une note** :

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌───────────┐
│ SAISIE  │─────>│ VALIDÉE  │─────>│ PUBLIÉE │      │ CONTESTÉE │
└─────────┘      └──────────┘      └─────────┘      └───────────┘
   (Prof)       (Resp. Péda)       (Scolarité)        (Étudiant)
```

#### 2. UEResult (Résultat UE)

**Responsabilité** : Agrège les notes de tous les EC d'une UE.

**Champs principaux** :
```python
class UEResult(BaseModel):
    student = ForeignKey(Student)
    ue = ForeignKey(UE)                    # Unité d'Enseignement
    exam_session = ForeignKey(ExamSession)
    
    average = DecimalField()               # Moyenne calculée
    credits_obtained = PositiveSmallInt()  # Crédits ECTS obtenus
    decision = CharField()                 # valide|ajourné|compense|dette
    
    # Classement
    rank_in_ue = PositiveIntegerField()    # Classement dans l'UE
    total_students = PositiveIntegerField() # Nombre d'étudiants
    percentile = DecimalField()            # Position en %
    
    # Compensation
    is_capitalized = BooleanField()        # UE définitivement acquise
    compensation_source = ForeignKey()      # UE qui compense
```

**Méthodes** :

```python
def calculate_ue_average(self):
    """
    Calcule moyenne UE = Σ(note_EC × coef_EC) / Σ(coef_EC)
    
    Règles LMD :
        - moyenne ≥ 10 : VALIDÉ + crédits acquis
        - moyenne < 10 : AJOURNÉ + 0 crédit
        
    Returns:
        Decimal: Moyenne calculée
    """
    grades = Grade.objects.filter(
        student=self.student,
        ec__ue=self.ue,
        exam_session=self.exam_session,
        status__in=['validee', 'publiee']
    )
    
    total_weighted = 0
    total_coef = 0
    
    for grade in grades:
        if not grade.is_absent and grade.final_grade:
            coef = float(grade.ec.coefficient or 1)
            total_weighted += float(grade.final_grade) * coef
            total_coef += coef
    
    if total_coef == 0:
        return None
    
    self.average = round(total_weighted / total_coef, 2)
    
    # Décision
    if self.average >= 10:
        self.decision = 'valide'
        self.credits_obtained = self.ue.credits
    else:
        self.decision = 'ajourné'
        self.credits_obtained = 0
    
    self.save()
    return self.average

def calculate_rank(self):
    """Calcule le classement de l'étudiant dans l'UE."""
    all_results = UEResult.objects.filter(
        ue=self.ue,
        exam_session=self.exam_session
    ).order_by('-average')
    
    self.total_students = all_results.count()
    
    for idx, result in enumerate(all_results, 1):
        if result.id == self.id:
            self.rank_in_ue = idx
            self.percentile = (idx / self.total_students) * 100
            break
    
    self.save()
```

#### 3. SemesterResult (Résultat Semestriel)

**Responsabilité** : Résultat final du semestre avec décision d'admission.

**Champs** :
```python
class SemesterResult(BaseModel):
    student = ForeignKey(Student)
    semester = ForeignKey(Semester)
    exam_session = ForeignKey(ExamSession)
    
    # Résultats
    average = DecimalField()               # Moyenne semestrielle
    total_credits = PositiveSmallInt()     # Total crédits du semestre
    credits_obtained = PositiveSmallInt()  # Crédits obtenus
    
    # Décision finale
    decision = CharField()                 # admis|ajourné|redoublant|exclu
    mention = CharField()                  # Très Bien|Bien|Assez Bien|Passable
    gpa = DecimalField()                   # Grade Point Average (0-4)
    
    # Détails
    ues_validated = PositiveSmallInt()     # Nombre d'UE validées
    ues_failed = PositiveSmallInt()        # Nombre d'UE échouées
    jury_observations = TextField()        # Observations du jury
    
    # Classement
    rank = PositiveIntegerField()          # Rang dans la promotion
    total_students_in_semester = PositiveInt()
    percentile = DecimalField()
    
    # Publication
    published = BooleanField()
    published_at = DateTimeField()
```

**Méthodes** :

```python
def calculate_semester_average(self):
    """
    Calcule moyenne semestre = Σ(moyenne_UE × crédits_UE) / Σ(crédits_UE)
    
    Détermine également :
        - Mention (Très Bien ≥16, Bien ≥14, Assez Bien ≥12, Passable ≥10)
        - GPA (0-4) = (moyenne/20) × 4
        - Décision (admis si moyenne ≥10 et max 2 UE échouées)
    """
    ue_results = UEResult.objects.filter(
        student=self.student,
        ue__semester=self.semester,
        exam_session=self.exam_session
    )
    
    total_weighted = 0
    total_credits = 0
    
    for ue_result in ue_results:
        if ue_result.average:
            credits = ue_result.ue.credits
            total_weighted += float(ue_result.average) * credits
            total_credits += credits
            
            if ue_result.decision == 'valide':
                self.ues_validated += 1
                self.credits_obtained += ue_result.credits_obtained
            else:
                self.ues_failed += 1
    
    if total_credits == 0:
        return None
    
    self.average = round(total_weighted / total_credits, 2)
    self.total_credits = total_credits
    
    # GPA
    self.gpa = round((float(self.average) / 20) * 4, 2)
    
    # Mention
    if self.average >= 16:
        self.mention = "Très Bien"
    elif self.average >= 14:
        self.mention = "Bien"
    elif self.average >= 12:
        self.mention = "Assez Bien"
    elif self.average >= 10:
        self.mention = "Passable"
    
    # Décision (avec compensation)
    if self.average >= 10 and self.ues_failed <= 2:
        self.decision = 'admis'
    else:
        self.decision = 'ajourné'
    
    self.save()
    return self.average

def publish_results(self):
    """Publie les résultats avec notification complète."""
    self.published = True
    self.published_at = timezone.now()
    self.save()
    
    message = f"""
    Résultats {self.semester}
    Moyenne: {self.average}/20
    Crédits: {self.credits_obtained}/{self.total_credits}
    Décision: {self.get_decision_display()}
    """
    if self.mention:
        message += f"\nMention: {self.mention}"
    if self.rank:
        message += f"\nClassement: {self.rank}/{self.total_students_in_semester}"
    
    Notification.objects.create(
        recipient=self.student.user,
        title=f"🎓 Résultats {self.semester}",
        message=message,
        type='resultat',
        priority='urgent'
    )
```

