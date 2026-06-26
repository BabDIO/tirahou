from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.programs.models import UE, EC
from apps.academic.models import AcademicYear
from apps.people.models import Student


class CourseSpace(BaseModel):
    MODE_CHOICES = [
        ('presentiel', 'Présentiel'),
        ('distanciel_sync', 'Distanciel Synchrone'),
        ('distanciel_async', 'Distanciel Asynchrone'),
        ('hybride', 'Hybride'),
        ('comodal', 'Comodal'),
    ]

    ue = models.ForeignKey(UE, on_delete=models.CASCADE, related_name='course_spaces')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='hybride')
    is_published = models.BooleanField(default=False)
    teachers = models.ManyToManyField(User, blank=True, related_name='course_spaces')
    enrolled_students = models.ManyToManyField(Student, blank=True, related_name='course_spaces')
    banner = models.ImageField(upload_to='lms/banners/', null=True, blank=True)

    class Meta:
        db_table = 'course_spaces'
        unique_together = ('ue', 'academic_year')
        verbose_name = 'Espace de Cours'

    def __str__(self):
        return f"{self.ue.code} — {self.academic_year}"


class CourseModule(BaseModel):
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    available_from = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'course_modules'
        ordering = ['order']
        verbose_name = 'Module de Cours'

    def __str__(self):
        return f"{self.course_space} — {self.title}"


class CourseResource(BaseModel):
    TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('video', 'Vidéo'),
        ('audio', 'Audio'),
        ('ppt', 'Présentation'),
        ('doc', 'Document Word'),
        ('excel', 'Tableur'),
        ('zip', 'Archive'),
        ('link', 'Lien externe'),
        ('notebook', 'Notebook'),
        ('image', 'Image'),
    ]

    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    file = models.FileField(upload_to='lms/resources/%Y/%m/', null=True, blank=True)
    external_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_downloadable = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    file_size = models.PositiveIntegerField(default=0)
    duration_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'course_resources'
        ordering = ['order']
        verbose_name = 'Ressource Pédagogique'

    def __str__(self):
        return f"{self.module} — {self.title}"


class Assignment(BaseModel):
    TYPE_CHOICES = [
        ('devoir', 'Devoir'),
        ('projet', 'Projet'),
        ('rapport', 'Rapport'),
        ('expose', 'Exposé'),
    ]

    STATUS_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('publie', 'Publié'),
        ('ferme', 'Fermé'),
        ('corrige', 'Corrigé'),
    ]

    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='devoir')
    instructions = models.TextField()
    max_grade = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    open_date = models.DateTimeField()
    due_date = models.DateTimeField()
    allow_late = models.BooleanField(default=False)
    max_file_size_mb = models.PositiveSmallIntegerField(default=10)
    allowed_formats = models.CharField(max_length=200, default='pdf,doc,docx,zip')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='brouillon')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'assignments'
        verbose_name = 'Devoir'

    def __str__(self):
        return f"{self.course_space} — {self.title}"


class AssignmentSubmission(BaseModel):
    STATUS_CHOICES = [
        ('soumis', 'Soumis'),
        ('en_retard', 'En retard'),
        ('corrige', 'Corrigé'),
        ('rendu', 'Rendu'),
    ]

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='submissions')
    file = models.FileField(upload_to='lms/submissions/%Y/%m/')
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_late = models.BooleanField(default=False)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='soumis')

    class Meta:
        db_table = 'assignment_submissions'
        unique_together = ('assignment', 'student')
        verbose_name = 'Rendu de Devoir'

    def __str__(self):
        return f"{self.student} — {self.assignment.title}"


class Quiz(BaseModel):
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    max_grade = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    open_date = models.DateTimeField(null=True, blank=True)
    close_date = models.DateTimeField(null=True, blank=True)
    randomize_questions = models.BooleanField(default=True)
    show_results_immediately = models.BooleanField(default=False)
    max_attempts = models.PositiveSmallIntegerField(default=1)
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'quizzes'
        verbose_name = 'Quiz'

    def __str__(self):
        return f"{self.course_space} — {self.title}"


class Question(BaseModel):
    TYPE_CHOICES = [
        ('qcm', 'QCM (choix unique)'),
        ('qcm_multiple', 'QCM (choix multiple)'),
        ('vrai_faux', 'Vrai / Faux'),
        ('reponse_courte', 'Réponse courte'),
        ('reponse_longue', 'Réponse longue'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='qcm')
    points = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    order = models.PositiveSmallIntegerField(default=0)
    explanation = models.TextField(blank=True)

    class Meta:
        db_table = 'questions'
        ordering = ['order']
        verbose_name = 'Question'

    def __str__(self):
        return f"Q{self.order} — {self.quiz.title}"


class QuestionChoice(BaseModel):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'question_choices'
        ordering = ['order']


class QuizAttempt(BaseModel):
    STATUS_CHOICES = [
        ('en_cours', 'En cours'),
        ('soumis', 'Soumis'),
        ('expire', 'Expiré'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='quiz_attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_cours')
    attempt_number = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = 'quiz_attempts'
        verbose_name = 'Tentative de Quiz'

    def __str__(self):
        return f"{self.student} — {self.quiz.title} (tentative {self.attempt_number})"


class StudentProgress(BaseModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='progress')
    course_space = models.ForeignKey(CourseSpace, on_delete=models.CASCADE, related_name='student_progress')
    resources_viewed = models.PositiveSmallIntegerField(default=0)
    total_resources = models.PositiveSmallIntegerField(default=0)
    completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_access = models.DateTimeField(null=True, blank=True)
    total_time_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'student_progress'
        unique_together = ('student', 'course_space')
        verbose_name = 'Progression Étudiant'

    def __str__(self):
        return f"{self.student} — {self.course_space} : {self.completion_rate}%"
