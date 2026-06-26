# ⚡ Commandes rapides - Tests et démo

## 🚀 Installation rapide

```bash
# Installation automatique
python install_improvements.py

# OU installation manuelle
python manage.py makemigrations
python manage.py migrate
```

---

## 🧪 Tests en shell Django

### 1. Analytics - Prédiction de réussite

```python
python manage.py shell

from apps.analytics_app.advanced_analytics import predict_student_success
from apps.people.models import Student

# Prédire la réussite du premier étudiant
student = Student.objects.first()
prediction = predict_student_success(student.id)

print(f"Score prédictif: {prediction['prediction_score']}")
print(f"Niveau de risque: {prediction['risk_level']}")
print(f"Probabilité de réussite: {prediction['success_probability']}")
print(f"Indicateurs: {prediction['indicators']}")
```

### 2. Analytics - Analyse de cohortes

```python
from apps.analytics_app.advanced_analytics import get_cohort_analysis
from apps.academic.models import AcademicYear

current_year = AcademicYear.objects.filter(is_current=True).first()
analysis = get_cohort_analysis(current_year.id if current_year else None)

print(f"Total inscrits: {analysis['total_enrolled']}")
print(f"Taux de rétention: {analysis['retention_rate']}%")
print(f"Taux de diplomation: {analysis['graduation_rate']}%")
```

### 3. Analytics - Top performers

```python
from apps.analytics_app.advanced_analytics import get_top_performers

top_10 = get_top_performers(limit=10)

for i, student in enumerate(top_10, 1):
    print(f"{i}. {student['name']} - Moyenne: {student['avg_grade']}/20")
```

### 4. Analytics - Étudiants à risque

```python
from apps.analytics_app.advanced_analytics import get_at_risk_students_detailed

at_risk = get_at_risk_students_detailed()

print(f"Nombre d'étudiants à risque: {len(at_risk)}")
for student in at_risk[:5]:  # Afficher les 5 premiers
    print(f"- {student['student_name']}: {student['risk_level']}")
    print(f"  Recommandations: {', '.join(student['recommendations'])}")
```

### 5. Notifications - Envoyer une notification

```python
from apps.communication.notification_service import NotificationService
from apps.people.models import Student

student = Student.objects.first()

notification = NotificationService.send_notification(
    recipient=student.user,
    title="Test de notification",
    message="Ceci est un test des nouvelles notifications en temps réel !",
    notification_type='info',
    priority='normal',
    channel='in_app',
    action_url='/dashboard',
    action_label='Voir le tableau de bord',
    icon='bell',
    color='blue'
)

print(f"Notification créée: {notification.id}")
```

### 6. Notifications - Notification groupée

```python
from apps.communication.notification_service import NotificationService
from apps.people.models import Student

students = Student.objects.all()[:5]

notifications = NotificationService.send_bulk_notification(
    recipients=[s.user for s in students],
    title="Annonce importante",
    message="Les examens finaux auront lieu la semaine prochaine",
    notification_type='info',
    priority='high',
    channel='all',
    icon='calendar',
    color='red'
)

print(f"{len(notifications)} notifications envoyées")
```

### 7. Notifications - Compter les non lues

```python
from apps.communication.notification_service import NotificationService
from apps.accounts.models import User

user = User.objects.first()
count = NotificationService.get_unread_count(user)

print(f"Notifications non lues: {count}")
```

### 8. Absences - Soumettre un justificatif

```python
from apps.attendance.attendance_service import AttendanceService
from apps.attendance.models import AttendanceRecord
from apps.people.models import Student

# Prendre un enregistrement d'absence
record = AttendanceRecord.objects.filter(status='absent').first()

if record:
    justification, message = AttendanceService.submit_justification(
        attendance_record=record,
        student=record.student,
        reason='medical',
        description='Consultation médicale d\'urgence',
        document=None
    )
    
    print(message)
    if justification:
        print(f"Justificatif créé: {justification.id}")
```

### 9. Absences - Statistiques d'assiduité

```python
from apps.attendance.attendance_service import AttendanceService
from apps.people.models import Student
from apps.academic.models import AcademicYear

student = Student.objects.first()
current_year = AcademicYear.objects.filter(is_current=True).first()

stats = AttendanceService.get_student_attendance_stats(student, current_year)

print(f"Sessions totales: {stats['total_sessions']}")
print(f"Présences: {stats['present']}")
print(f"Absences: {stats['absent']}")
print(f"Retards: {stats['late']}")
print(f"Taux d'assiduité: {stats['attendance_rate']}%")
print(f"Taux de ponctualité: {stats['punctuality_rate']}%")
```

### 10. Absences - Créer une politique d'assiduité

```python
from apps.attendance.advanced_models import AttendancePolicy
from apps.lms.models import CourseSpace

course = CourseSpace.objects.first()

policy = AttendancePolicy.objects.create(
    course_space=course,
    min_attendance_rate=75.0,
    max_absences_allowed=3,
    warning_threshold=2,
    critical_threshold=4,
    auto_notify_student=True,
    auto_notify_teacher=True,
    require_justification=True,
    justification_deadline_days=3,
    auto_approve_medical=False,
    is_active=True
)

print(f"Politique créée pour {course.title}")
```

---

## 🌐 Tests API avec curl

### 1. Analytics - Prédiction de réussite

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/predict-success/?student_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Analytics - Analyse de cohortes

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/cohort-analysis/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Analytics - Tendances de performance

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/performance-trends/?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Analytics - Top performers

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/top-performers/?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Analytics - Étudiants à risque

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/at-risk-detailed/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Notifications - Liste

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/communication/realtime-notifications/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Notifications - Compter non lues

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/communication/realtime-notifications/unread_count/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Notifications - Marquer comme lue

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/communication/realtime-notifications/1/mark_read/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Notifications - Tout marquer comme lu

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/communication/realtime-notifications/mark_all_read/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Tests avec Postman

### Collection Postman

Créer une collection avec ces requêtes :

#### 1. Analytics

```json
{
  "name": "Analytics - Predict Success",
  "request": {
    "method": "GET",
    "url": "{{base_url}}/api/v1/analytics/predict-success/?student_id=1",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      }
    ]
  }
}
```

#### 2. Notifications

```json
{
  "name": "Notifications - Get All",
  "request": {
    "method": "GET",
    "url": "{{base_url}}/api/v1/communication/realtime-notifications/",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      }
    ]
  }
}
```

---

## 🎯 Scénarios de test complets

### Scénario 1 : Détection d'étudiant à risque

```python
# 1. Identifier un étudiant à risque
from apps.analytics_app.advanced_analytics import get_at_risk_students_detailed

at_risk = get_at_risk_students_detailed()
if at_risk:
    student_data = at_risk[0]
    print(f"Étudiant à risque: {student_data['student_name']}")
    
    # 2. Envoyer une notification
    from apps.communication.notification_service import NotificationService
    from apps.people.models import Student
    
    student = Student.objects.get(id=student_data['student_id'])
    
    NotificationService.send_notification(
        recipient=student.user,
        title="Alerte d'assiduité",
        message=f"Votre taux d'assiduité est préoccupant. Recommandations: {', '.join(student_data['recommendations'])}",
        notification_type='absence',
        priority='urgent',
        channel='all',
        icon='alert-triangle',
        color='red'
    )
    
    print("✅ Notification envoyée")
```

### Scénario 2 : Workflow complet de justificatif

```python
# 1. Créer une absence
from apps.attendance.models import AttendanceRecord, AttendanceSheet
from apps.people.models import Student
from apps.scheduling_app.models import ScheduledSession

student = Student.objects.first()
session = ScheduledSession.objects.first()

# Créer la feuille de présence
sheet, _ = AttendanceSheet.objects.get_or_create(session=session)

# Créer l'absence
record = AttendanceRecord.objects.create(
    sheet=sheet,
    student=student,
    status='absent'
)

print(f"✅ Absence créée: {record.id}")

# 2. Soumettre un justificatif
from apps.attendance.attendance_service import AttendanceService

justification, message = AttendanceService.submit_justification(
    attendance_record=record,
    student=student,
    reason='medical',
    description='Consultation médicale',
    document=None
)

print(f"✅ {message}")

# 3. Valider le justificatif
if justification:
    success, msg = AttendanceService.review_justification(
        justification_id=justification.id,
        reviewer=session.teacher.user,
        status='approved',
        comment='Certificat médical valide'
    )
    
    print(f"✅ {msg}")

# 4. Vérifier les statistiques
stats = AttendanceService.get_student_attendance_stats(student)
print(f"✅ Taux d'assiduité: {stats['attendance_rate']}%")
```

### Scénario 3 : Campagne de feedback

```python
# 1. Créer une campagne
from apps.evaluation.feedback_models import FeedbackCampaign
from apps.academic.models import AcademicYear
from datetime import date, timedelta

current_year = AcademicYear.objects.filter(is_current=True).first()

campaign = FeedbackCampaign.objects.create(
    title="Évaluation Semestre 1 2024",
    description="Évaluez vos cours du premier semestre",
    academic_year=current_year,
    start_date=date.today(),
    end_date=date.today() + timedelta(days=14),
    target_all_courses=True,
    is_mandatory=False,
    allow_anonymous=True,
    status='active'
)

print(f"✅ Campagne créée: {campaign.title}")

# 2. Soumettre un feedback
from apps.evaluation.feedback_models import CourseFeedback
from apps.people.models import Student
from apps.lms.models import CourseSpace

student = Student.objects.first()
course = CourseSpace.objects.first()

feedback = CourseFeedback.objects.create(
    student=student,
    course_space=course,
    academic_year=current_year,
    content_quality=4,
    teaching_quality=5,
    organization=4,
    resources_quality=4,
    difficulty_level=3,
    workload=3,
    positive_aspects="Cours très bien structuré",
    improvements_needed="Plus d'exercices pratiques",
    would_recommend=True,
    is_anonymous=True
)

print(f"✅ Feedback soumis: {feedback.overall_rating}/5")
```

---

## 🔍 Vérifications

### Vérifier les migrations

```bash
python manage.py showmigrations
```

### Vérifier les modèles

```bash
python manage.py shell

from apps.communication.realtime_models import RealtimeNotification
from apps.attendance.advanced_models import AbsenceJustification
from apps.evaluation.feedback_models import CourseFeedback
from apps.lms.collaborative_models import StudyGroup

print("✅ Tous les modèles sont importables")
```

### Vérifier les endpoints

```bash
# Lancer le serveur
python manage.py runserver

# Ouvrir Swagger
open http://127.0.0.1:8000/api/schema/swagger-ui/
```

---

## 📝 Logs et débogage

### Voir les logs

```bash
tail -f logs/siguvh.log
```

### Mode debug Django

```python
# Dans settings.py
DEBUG = True

# Relancer le serveur
python manage.py runserver
```

### Shell Django interactif

```bash
python manage.py shell_plus --print-sql
```

---

## 🎉 Démo complète

```bash
# 1. Installation
python install_improvements.py

# 2. Lancer le serveur
python manage.py runserver

# 3. Ouvrir Swagger
open http://127.0.0.1:8000/api/schema/swagger-ui/

# 4. Tester les endpoints
# Utiliser Swagger UI pour tester interactivement

# 5. Voir les résultats
# Consulter la base de données ou les logs
```

---

## 📞 Support

En cas de problème :

1. Vérifier les logs : `tail -f logs/siguvh.log`
2. Vérifier les migrations : `python manage.py showmigrations`
3. Tester en shell : `python manage.py shell`
4. Consulter la documentation : `AMELIORATIONS_COMPLETES.md`

---

## ✅ Checklist de validation

- [ ] Migrations appliquées
- [ ] Modèles importables
- [ ] Endpoints accessibles
- [ ] Tests shell réussis
- [ ] Tests API réussis
- [ ] Swagger fonctionnel
- [ ] Données de test créées
- [ ] Notifications envoyées
- [ ] Analytics calculés
- [ ] Absences gérées

---

**Toutes les fonctionnalités sont prêtes à être testées ! 🚀**
