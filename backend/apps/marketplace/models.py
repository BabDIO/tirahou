from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student


class MarketplaceCourse(BaseModel):
    """Cours indépendant du cursus officiel, créé et vendu par un enseignant."""
    LEVEL_CHOICES = [
        ('debutant', 'Débutant'),
        ('intermediaire', 'Intermédiaire'),
        ('avance', 'Avancé'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('archived', 'Archivé'),
    ]

    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marketplace_courses')
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='debutant')
    cover_image = models.ImageField(upload_to='marketplace/covers/', null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Prix en points du portefeuille")
    is_free = models.BooleanField(default=False)
    duration_hours = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'marketplace_courses'
        ordering = ['-created_at']
        verbose_name = 'Cours Marketplace'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid
            base = slugify(self.title)[:190] or 'cours'
            self.slug = f"{base}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def update_rating(self):
        agg = self.reviews.aggregate(avg=models.Avg('rating'), count=models.Count('id'))
        self.rating = round(agg['avg'] or 0, 2)
        self.rating_count = agg['count'] or 0
        self.save(update_fields=['rating', 'rating_count', 'updated_at'])


class CourseLesson(BaseModel):
    """Leçon d'un cours marketplace."""
    CONTENT_TYPE_CHOICES = [
        ('video', 'Vidéo'),
        ('document', 'Document'),
        ('text', 'Texte'),
        ('quiz', 'Quiz'),
    ]

    course = models.ForeignKey(MarketplaceCourse, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='text')
    content_url = models.URLField(blank=True)
    content_text = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=10)
    order = models.PositiveSmallIntegerField(default=0)
    is_preview = models.BooleanField(default=False, help_text="Accessible gratuitement sans achat (aperçu)")

    class Meta:
        db_table = 'marketplace_lessons'
        ordering = ['order']
        verbose_name = 'Leçon'

    def __str__(self):
        return f"{self.course.title} — {self.title}"


class CoursePurchase(BaseModel):
    """Achat d'un cours par un étudiant, réglé en points du portefeuille interne."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='marketplace_purchases')
    course = models.ForeignKey(MarketplaceCourse, on_delete=models.CASCADE, related_name='purchases')
    price_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'marketplace_purchases'
        unique_together = ('student', 'course')
        verbose_name = 'Achat de Cours'

    def __str__(self):
        return f"{self.student} — {self.course.title}"


class LessonCompletion(BaseModel):
    """Progression d'un étudiant dans un cours acheté."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='marketplace_lesson_completions')
    lesson = models.ForeignKey(CourseLesson, on_delete=models.CASCADE, related_name='completions')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'marketplace_lesson_completions'
        unique_together = ('student', 'lesson')
        verbose_name = 'Complétion de Leçon'


class CourseReview(BaseModel):
    """Avis d'un étudiant sur un cours acheté."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='marketplace_reviews')
    course = models.ForeignKey(MarketplaceCourse, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True)

    class Meta:
        db_table = 'marketplace_reviews'
        unique_together = ('student', 'course')
        verbose_name = 'Avis'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student} — {self.course.title} ({self.rating}/5)"
