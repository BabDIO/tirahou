# 🤝 Guide de Contribution - TIRAHOU

Merci de votre intérêt pour contribuer au projet TIRAHOU ! Ce guide vous aidera à démarrer.

---

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Environnement de Développement](#environnement-de-développement)
- [Standards de Code](#standards-de-code)
- [Process de Pull Request](#process-de-pull-request)
- [Reporting de Bugs](#reporting-de-bugs)
- [Suggestions de Fonctionnalités](#suggestions-de-fonctionnalités)

---

## 📜 Code de Conduite

### Notre Engagement

Nous nous engageons à faire de la participation à ce projet une expérience sans harcèlement pour tout le monde, indépendamment de :
- L'âge
- La taille corporelle
- Le handicap
- L'ethnicité
- L'identité et l'expression de genre
- Le niveau d'expérience
- La nationalité
- L'apparence personnelle
- La race
- La religion
- L'identité et l'orientation sexuelle

### Comportements Attendus

- Utiliser un langage accueillant et inclusif
- Respecter les différents points de vue et expériences
- Accepter les critiques constructives avec grâce
- Se concentrer sur ce qui est le mieux pour la communauté
- Faire preuve d'empathie envers les autres membres de la communauté

### Comportements Inacceptables

- Commentaires insultants/désobligeants
- Attaques personnelles ou politiques
- Harcèlement public ou privé
- Publication d'informations privées d'autrui sans permission
- Toute conduite qui pourrait raisonnablement être considérée comme inappropriée

---

## 🚀 Comment Contribuer

### Types de Contributions

Nous acceptons plusieurs types de contributions :

1. **🐛 Correction de bugs** - Résoudre des problèmes existants
2. **✨ Nouvelles fonctionnalités** - Ajouter de nouvelles capacités
3. **📚 Documentation** - Améliorer ou créer de la documentation
4. **🎨 UI/UX** - Améliorer l'interface utilisateur
5. **🧪 Tests** - Ajouter ou améliorer les tests
6. **♻️ Refactoring** - Améliorer la qualité du code
7. **⚡ Performance** - Optimiser le code existant

### Workflow de Contribution

1. **Fork** le projet
2. **Clone** votre fork localement
3. **Créer une branche** pour votre fonctionnalité/correction
4. **Implémenter** vos changements
5. **Tester** vos changements
6. **Commit** avec un message descriptif
7. **Push** vers votre fork
8. **Créer une Pull Request**

---

## 💻 Environnement de Développement

### Prérequis

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+
- **Git**
- **Docker** (optionnel)

### Configuration Initiale

#### 1. Fork et Clone

```bash
# Fork le projet sur GitHub, puis :
git clone https://github.com/VOTRE_USERNAME/tirahou.git
cd tirahou

# Ajouter le remote upstream
git remote add upstream https://github.com/BabDIO/tirahou.git
```

#### 2. Backend Setup

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

#### 3. Frontend Setup

```bash
cd frontend

# Installer les dépendances
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Lancer le serveur de dev
npm run dev
```

### Branches

- `main` - Branche principale (production)
- `develop` - Branche de développement (si utilisée)
- `feature/nom-feature` - Nouvelles fonctionnalités
- `fix/nom-bug` - Corrections de bugs
- `docs/nom-doc` - Documentation
- `refactor/nom-refactor` - Refactoring
- `test/nom-test` - Tests

---

## 📏 Standards de Code

### Backend (Python/Django)

#### Style de Code

Nous suivons **PEP 8** avec quelques adaptations :

```python
# ✅ Bon
def calculate_final_grade(cc_grade: float, exam_grade: float) -> float:
    """
    Calculate final grade using 40% CC + 60% Exam formula.
    
    Args:
        cc_grade: Continuous assessment grade (0-20)
        exam_grade: Final exam grade (0-20)
        
    Returns:
        Final grade rounded to 2 decimals
    """
    if not (0 <= cc_grade <= 20 and 0 <= exam_grade <= 20):
        raise ValueError("Grades must be between 0 and 20")
    
    final = (cc_grade * 0.4) + (exam_grade * 0.6)
    return round(final, 2)

# ❌ Mauvais
def calc(a,b):
    return (a*.4)+(b*.6)
```

#### Conventions

- **Noms de classes** : `PascalCase` (ex: `StudentEnrollment`)
- **Noms de fonctions/variables** : `snake_case` (ex: `get_student_grades`)
- **Constantes** : `UPPER_SNAKE_CASE` (ex: `MAX_GRADE`)
- **Noms privés** : `_leading_underscore` (ex: `_calculate_average`)

#### Docstrings

Utiliser le format Google :

```python
def get_student_transcript(student_id: int, semester_id: int) -> dict:
    """
    Get the academic transcript for a student in a specific semester.
    
    Args:
        student_id: The unique identifier of the student
        semester_id: The unique identifier of the semester
        
    Returns:
        Dictionary containing grades, credits, and GPA
        
    Raises:
        Student.DoesNotExist: If student not found
        Semester.DoesNotExist: If semester not found
    """
    pass
```

#### Tests Backend

```python
from django.test import TestCase
from apps.evaluation.models import Grade

class GradeModelTests(TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.student = Student.objects.create(...)
        
    def test_calculate_final_grade(self):
        """Test that final grade is calculated correctly"""
        grade = Grade.objects.create(
            cc_grade=15.0,
            exam_grade=18.0,
            student=self.student
        )
        self.assertEqual(grade.final_grade, 16.8)
        
    def tearDown(self):
        """Clean up after tests"""
        Grade.objects.all().delete()
```

### Frontend (TypeScript/React)

#### Style de Code

Nous suivons **Airbnb Style Guide** avec quelques adaptations :

```typescript
// ✅ Bon
interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
}

const StudentCard: React.FC<{ student: Student }> = ({ student }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const handleToggle = () => {
    setIsExpanded(prev => !prev)
  }
  
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold">{student.firstName} {student.lastName}</h3>
      <p className="text-gray-500">{student.email}</p>
      {isExpanded && <StudentDetails student={student} />}
      <button onClick={handleToggle}>
        {isExpanded ? 'Réduire' : 'Développer'}
      </button>
    </div>
  )
}

// ❌ Mauvais
const StudentCard = (props) => {
  const [exp, setExp] = useState(false)
  return <div onClick={() => setExp(!exp)}>{props.student.firstName}</div>
}
```

#### Conventions

- **Composants** : `PascalCase` (ex: `StudentCard`)
- **Fonctions/variables** : `camelCase` (ex: `handleSubmit`)
- **Constantes** : `UPPER_SNAKE_CASE` (ex: `API_BASE_URL`)
- **Types/Interfaces** : `PascalCase` avec préfixe `I` optionnel (ex: `IStudent` ou `Student`)
- **Hooks personnalisés** : `use` prefix (ex: `useStudentData`)

#### Structure de Fichier

```typescript
// 1. Imports externes
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Imports internes
import { api } from '@/api'
import { Button } from '@/components/ui'

// 3. Types
interface Props {
  studentId: string
}

// 4. Constantes
const MAX_RETRIES = 3

// 5. Composant
export default function StudentPage({ studentId }: Props) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false)
  
  // Queries
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => api.students.getById(studentId)
  })
  
  // Handlers
  const handleSave = () => {
    // ...
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

#### Tests Frontend

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import StudentCard from './StudentCard'

describe('StudentCard', () => {
  const mockStudent = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  }
  
  it('renders student information', () => {
    render(<StudentCard student={mockStudent} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
  
  it('toggles details on button click', () => {
    render(<StudentCard student={mockStudent} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(screen.getByTestId('student-details')).toBeVisible()
  })
})
```

### Git Commit Messages

Nous utilisons **Conventional Commits** :

```bash
# Format
<type>(<scope>): <subject>

<body>

<footer>

# Types
feat:     Nouvelle fonctionnalité
fix:      Correction de bug
docs:     Documentation
style:    Formatage, point-virgules manquants, etc.
refactor: Refactoring du code
test:     Ajout de tests
chore:    Maintenance, dépendances, etc.
perf:     Amélioration de performance
ci:       CI/CD

# Exemples
feat(evaluation): add bulk grade validation for teachers
fix(auth): resolve token refresh infinite loop
docs(readme): update installation instructions
refactor(api): centralize constants in lib/constants.ts
test(student): add unit tests for StudentCard component
```

---

## 🔄 Process de Pull Request

### Avant de Créer une PR

1. **Synchroniser avec upstream**
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Créer une branche**
```bash
git checkout -b feature/ma-nouvelle-fonctionnalite
```

3. **Faire vos changements**
```bash
# Coder...
git add .
git commit -m "feat(module): description du changement"
```

4. **Tester**
```bash
# Backend
python manage.py test

# Frontend
npm run test
npm run build
```

5. **Push**
```bash
git push origin feature/ma-nouvelle-fonctionnalite
```

### Créer la Pull Request

1. Aller sur GitHub et créer une PR depuis votre branche
2. Remplir le template de PR avec :
   - **Description** : Qu'est-ce qui change et pourquoi ?
   - **Type** : Feature / Fix / Docs / Refactor / etc.
   - **Tests** : Comment avez-vous testé ?
   - **Screenshots** : Si changements UI
   - **Checklist** : Cocher tous les items

### Template de Pull Request

```markdown
## Description
Courte description des changements

## Type de Changement
- [ ] Bug fix (changement non-breaking qui corrige un problème)
- [ ] New feature (changement non-breaking qui ajoute une fonctionnalité)
- [ ] Breaking change (correction ou feature qui changerait le comportement existant)
- [ ] Documentation update

## Comment a été Testé ?
Décrire les tests effectués

## Checklist
- [ ] Mon code suit le style guide du projet
- [ ] J'ai effectué une auto-review de mon code
- [ ] J'ai commenté le code, particulièrement dans les zones complexes
- [ ] J'ai fait les changements correspondants dans la documentation
- [ ] Mes changements ne génèrent pas de nouveaux warnings
- [ ] J'ai ajouté des tests qui prouvent que ma correction est efficace ou que ma feature fonctionne
- [ ] Les tests unitaires passent localement
- [ ] Le build de production réussit

## Screenshots (si applicable)
Ajouter des screenshots pour les changements UI
```

### Review Process

1. **Automated Checks** : CI/CD vérifie automatiquement
2. **Code Review** : Un mainteneur review le code
3. **Discussions** : Répondre aux commentaires
4. **Approbation** : Une fois approuvé, la PR sera mergée

---

## 🐛 Reporting de Bugs

### Avant de Reporter

1. **Vérifier** que le bug n'est pas déjà reporté
2. **Reproduire** le bug sur la dernière version
3. **Collecter** les informations nécessaires

### Template de Bug Report

```markdown
## Description du Bug
Courte description claire du bug

## Pour Reproduire
Étapes pour reproduire :
1. Aller sur '...'
2. Cliquer sur '....'
3. Scroller jusqu'à '....'
4. Voir l'erreur

## Comportement Attendu
Description de ce qui devrait se passer

## Screenshots
Si applicable, ajouter des screenshots

## Environnement
- OS: [ex: Windows 11]
- Navigateur: [ex: Chrome 120]
- Version: [ex: 1.2.0]

## Logs/Erreurs
```
Coller les logs d'erreur ici
```

## Informations Additionnelles
Tout autre contexte pertinent
```

---

## 💡 Suggestions de Fonctionnalités

### Template de Feature Request

```markdown
## Problème à Résoudre
Description claire du problème que cette feature résoudrait

## Solution Proposée
Description claire de ce que vous voulez voir implémenté

## Alternatives Considérées
Autres solutions que vous avez envisagées

## Contexte Additionnel
Screenshots, mockups, ou autres informations pertinentes
```

---

## 📞 Contact

- **Issues GitHub** : [https://github.com/BabDIO/tirahou/issues](https://github.com/BabDIO/tirahou/issues)
- **Discussions** : [https://github.com/BabDIO/tirahou/discussions](https://github.com/BabDIO/tirahou/discussions)
- **Email** : tirahou@example.com

---

## 🙏 Remerciements

Merci à tous les contributeurs qui aident à faire de TIRAHOU un meilleur projet !

### Top Contributors

<!-- Sera mis à jour automatiquement -->

---

## 📄 Licence

En contribuant à TIRAHOU, vous acceptez que vos contributions soient sous licence [MIT](LICENSE).

---

<div align="center">

**🎉 Merci de contribuer à TIRAHOU ! 🎉**

Made with ❤️ by the community

</div>
