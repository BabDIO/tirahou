"""
Système d'évaluation et feedback des cours
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student, Teacher
from apps.lms.models import CourseSpace
from apps.academic.models import AcademicYear


class CourseFeedback(BaseModel):
    """Évaluation d'un cours par un étudiant"""
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='course_feedbacks')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='feedbacks')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    
    # Évaluations (1-5 étoiles)
    content_quality = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Qualité du contenu"
    )
    teaching_quality = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Qualité de l'enseignement"
    )
    organization = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Organisation du cours"
    )
    resources_quality = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Qualité des ressources"
    )
    difficulty_level = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Niveau de difficulté (1=très facile, 5=très difficile)"
    )
    workload = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Charge de travail (1=très légère, 5=très lourde)"
    )
    
    # Score global calculé
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    
    # Commentaires
    positive_aspects = models.TextField(blank=True, help_text="Ce qui a bien fonctionné")
    improvements_needed = models.TextField(blank=True, help_text="Points à améliorer")
    additional_comments = models.TextField(blank=True)
    
    # Recommandation
    would_recommend = models.BooleanField(default=True)
    
    # Métadonnées
    is_anonymous = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'course_feedbacks'
        unique_together = ('student', 'course_space', 'academic_year')
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['course_space', 'is_published']),
            models.Index(fields=['overall_rating']),
        ]
    
    def save(self, *args, **kwargs):
        # Calculer le score global
        self.overall_rating = (
            self.content_quality +
            self.teaching_quality +
            self.organization +
            self.resources_quality
        ) / 4.0
        super().save(*args, **kwargs)
    
    def __str__(self):
        student_name = "Anonyme" if self.is_anonymous else self.student.user.get_full_name()
        return f"{student_name} - {self.course_space.title} ({self.overall_rating}/5)"


class TeacherFeedback(BaseModel):
    """Évaluation d'un enseignant par un étudiant"""
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='teacher_feedbacks')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='feedbacks')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    
    # Évaluations (1-5 étoiles)
    clarity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Clarté des explications"
    )
    availability = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Disponibilité et accessibilité"
    )
    responsiveness = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Réactivité aux questions"
    )
    engagement = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Capacité à engager les étudiants"
    )
    fairness = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Équité dans l'évaluation"
    )
    
    # Score global
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    
    # Commentaires
    strengths = models.TextField(blank=True, help_text="Points forts")
    areas_for_improvement = models.TextField(blank=True, help_text="Axes d'amélioration")
    
    # Métadonnées
    is_anonymous = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_feedbacks'
        unique_together = ('student', 'teacher', 'course_space', 'academic_year')
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['teacher', 'is_published']),
            models.Index(fields=['overall_rating']),
        ]
    
    def save(self, *args, **kwargs):
        # Calculer le score global
        self.overall_rating = (
            self.clarity +
            self.availability +
            self.responsiveness +
            self.engagement +
            self.fairness
        ) / 5.0
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Évaluation de {self.teacher.user.get_full_name()} ({self.overall_rating}/5)"


class FeedbackCampaign(BaseModel):
    """Campagne d'évaluation des cours"""
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('active', 'Active'),
        ('closed', 'Clôturée'),
        ('archived', 'Archivée'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    
    # Période
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Ciblage
    target_courses = models.ManyToManyField(CourseSpace, blank=True)
    target_all_courses = models.BooleanField(default=True)
    
    # Configuration
    is_mandatory = models.BooleanField(default=False)
    allow_anonymous = models.BooleanField(default=True)
    show_results_to_students = models.BooleanField(default=False)
    
    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Statistiques
    total_responses = models.PositiveIntegerField(default=0)
    response_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'feedback_campaigns'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} ({self.start_date} - {self.end_date})"


class FeedbackReport(BaseModel):
    """Rapport d'évaluation pour un cours"""
    
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='feedback_reports')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    campaign = models.ForeignKey(FeedbackCampaign, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Statistiques agrégées
    total_responses = models.PositiveIntegerField(default=0)
    response_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Moyennes
    avg_content_quality = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    avg_teaching_quality = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    avg_organization = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    avg_resources_quality = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    avg_overall_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    
    # Recommandation
    recommendation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Analyse textuelle
    top_positive_keywords = models.JSONField(default=list, blank=True)
    top_improvement_keywords = models.JSONField(default=list, blank=True)
    
    # Métadonnées
    generated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'feedback_reports'
        unique_together = ('course_space', 'academic_year')
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"Rapport - {self.course_space.title} ({self.academic_year})"


class ContinuousFeedback(BaseModel):
    """Feedback continu pendant le cours (micro-feedback)"""
    
    FEEDBACK_TYPE_CHOICES = [
        ('pace', 'Rythme du cours'),
        ('clarity', 'Clarté'),
        ('difficulty', 'Difficulté'),
        ('engagement', 'Engagement'),
        ('technical', 'Problème technique'),
        ('other', 'Autre'),
    ]
    
    SENTIMENT_CHOICES = [
        ('positive', 'Positif'),
        ('neutral', 'Neutre'),
        ('negative', 'Négatif'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='continuous_feedbacks')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='continuous_feedbacks')
    session = models.ForeignKey('scheduling_app.ScheduledSession', on_delete=models.CASCADE, null=True, blank=True)
    
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES)
    sentiment = models.CharField(max_length=10, choices=SENTIMENT_CHOICES)
    comment = models.TextField(blank=True)
    
    # Réaction rapide (emoji)
    emoji_reaction = models.CharField(max_length=10, blank=True)
    
    is_anonymous = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'continuous_feedbacks'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['course_space', 'submitted_at']),
            models.Index(fields=['sentiment']),
        ]
    
    def __str__(self):
        return f"{self.get_feedback_type_display()} - {self.sentiment}"
