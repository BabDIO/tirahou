from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student
from apps.lms.models import CourseSpace, CourseResource
from apps.academic.models import AcademicYear


class LearningActivity(BaseModel):
    ACTION_CHOICES = [
        ('connexion', 'Connexion'),
        ('vue_ressource', 'Vue ressource'),
        ('telechargement', 'Téléchargement'),
        ('soumission_devoir', 'Soumission devoir'),
        ('tentative_quiz', 'Tentative quiz'),
        ('participation_forum', 'Participation forum'),
        ('classe_virtuelle', 'Classe virtuelle'),
        ('vue_video', 'Vue vidéo'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='learning_activities')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    resource = models.ForeignKey(CourseResource, on_delete=models.SET_NULL, null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_type = models.CharField(max_length=20, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'learning_activities'
        ordering = ['-timestamp']
        verbose_name = 'Activité d\'Apprentissage'

    def __str__(self):
        return f"{self.student} — {self.action} ({self.timestamp.date()})"


class EngagementScore(BaseModel):
    RISK_CHOICES = [
        ('faible', 'Faible risque'),
        ('moyen', 'Risque moyen'),
        ('eleve', 'Risque élevé'),
        ('critique', 'Risque critique'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='engagement_scores')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='engagement_scores')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    # Indicateurs
    connection_count = models.PositiveIntegerField(default=0)
    total_time_minutes = models.PositiveIntegerField(default=0)
    resources_viewed = models.PositiveSmallIntegerField(default=0)
    assignments_submitted = models.PositiveSmallIntegerField(default=0)
    quizzes_attempted = models.PositiveSmallIntegerField(default=0)
    forum_posts = models.PositiveSmallIntegerField(default=0)
    virtual_class_attended = models.PositiveSmallIntegerField(default=0)
    completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # Nouveaux indicateurs
    forum_participation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="% de participation aux forums")
    quiz_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="% de quiz complétés")
    avg_module_progress = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Progression moyenne sur les modules")
    # Score global
    engagement_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    dropout_risk = models.CharField(max_length=10, choices=RISK_CHOICES, default='faible')
    last_computed = models.DateTimeField(auto_now=True)
    alert_sent = models.BooleanField(default=False)
    
    # AMÉLIORATION: Prédiction de réussite
    success_prediction_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Score prédictif de réussite (0-100)")
    success_probability = models.CharField(max_length=50, blank=True, help_text="Probabilité de réussite")
    recommendations = models.JSONField(default=list, blank=True, help_text="Recommandations personnalisées")
    last_activity_date = models.DateField(null=True, blank=True, help_text="Date de dernière activité")
    days_inactive = models.PositiveSmallIntegerField(default=0, help_text="Jours d'inactivité")

    class Meta:
        db_table = 'engagement_scores'
        unique_together = ('student', 'course_space', 'academic_year')
        verbose_name = 'Score d\'Engagement'

    def __str__(self):
        return f"{self.student} — {self.course_space} : {self.engagement_score} ({self.dropout_risk})"
    
    def calculate_success_prediction(self):
        """Calculer la prédiction de réussite avec de nouveaux indicateurs"""
        from apps.evaluation.models import Grade
        from apps.attendance.models import AttendanceRecord
        from apps.lms.models import StudentProgress, AssignmentSubmission, QuizAttempt
        from django.db.models import Avg, Count
        
        # Moyenne des notes (35%)
        avg_grade = Grade.objects.filter(
            enrollment__admin_enrollment__student=self.student
        ).aggregate(avg=Avg('score'))['avg'] or 0
        
        # Taux d'assiduité (25%)
        attendance_rate = AttendanceRecord.objects.filter(
            student=self.student, status='present'
        ).count() / max(AttendanceRecord.objects.filter(student=self.student).count(), 1) * 100
        
        # Score d'engagement (15%)
        engagement = float(self.engagement_score)
        
        # Taux de complétion (10%)
        completion = float(self.completion_rate)
        
        # Taux de participation aux forums (5%)
        total_forum_posts = self.forum_posts
        total_activities = self.connection_count + self.resources_viewed + self.assignments_submitted + self.quizzes_attempted + self.forum_posts + self.virtual_class_attended
        forum_participation_rate = (total_forum_posts / max(total_activities, 1)) * 100
        self.forum_participation_rate = forum_participation_rate
        
        # Taux de complétion des quiz (5%)
        total_quizzes = QuizAttempt.objects.filter(student=self.student).count()
        total_quiz_assigned = AssignmentSubmission.objects.filter(student=self.student, assignment__type='quiz').count()
        quiz_completion_rate = (total_quizzes / max(total_quiz_assigned, 1)) * 100 if total_quiz_assigned > 0 else 0
        self.quiz_completion_rate = quiz_completion_rate
        
        # Progression moyenne sur les modules (5%)
        avg_module_progress = StudentProgress.objects.filter(student=self.student).aggregate(avg=Avg('completion_rate'))['avg'] or 0
        self.avg_module_progress = avg_module_progress
        
        # Calcul du score prédictif (pondération ajustée)
        self.success_prediction_score = (
            avg_grade * 0.35 +
            attendance_rate * 0.25 +
            engagement * 0.15 +
            completion * 0.10 +
            forum_participation_rate * 0.05 +
            quiz_completion_rate * 0.05 +
            avg_module_progress * 0.05
        )
        
        # Classification
        if self.success_prediction_score >= 75:
            self.success_probability = 'Élevée (>80%)'
            self.dropout_risk = 'faible'
        elif self.success_prediction_score >= 60:
            self.success_probability = 'Moyenne (60-80%)'
            self.dropout_risk = 'moyen'
        elif self.success_prediction_score >= 45:
            self.success_probability = 'Faible (40-60%)'
            self.dropout_risk = 'eleve'
        else:
            self.success_probability = 'Très faible (<40%)'
            self.dropout_risk = 'critique'
        
        # Générer des recommandations
        self.recommendations = []
        if self.connection_count < 5:
            self.recommendations.append("Augmenter la fréquence de connexion")
        if self.completion_rate < 30:
            self.recommendations.append("Compléter les modules de cours")
        if self.assignments_submitted == 0:
            self.recommendations.append("Soumettre les devoirs")
        if attendance_rate < 75:
            self.recommendations.append("Améliorer l'assiduité")
        if forum_participation_rate < 10:
            self.recommendations.append("Participer davantage aux forums")
        if quiz_completion_rate < 50:
            self.recommendations.append("Terminer les quiz attribués")
        if avg_module_progress < 40:
            self.recommendations.append("Progresser sur les modules de cours")
        
        self.save()
        return self.success_prediction_score


class DashboardStat(BaseModel):
    STAT_TYPE_CHOICES = [
        ('effectifs', 'Effectifs'),
        ('inscriptions', 'Inscriptions'),
        ('paiements', 'Paiements'),
        ('resultats', 'Résultats'),
        ('assiduité', 'Assiduité'),
        ('lms', 'Activité LMS'),
    ]

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    stat_type = models.CharField(max_length=20, choices=STAT_TYPE_CHOICES)
    label = models.CharField(max_length=200)
    value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    extra_data = models.JSONField(default=dict, blank=True)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dashboard_stats'
        verbose_name = 'Statistique Dashboard'

    def __str__(self):
        return f"{self.stat_type} — {self.label} : {self.value}"
