from django.db import models
from django.utils import timezone
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
    prerequisite_module = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                             related_name='unlocks', help_text="Module à terminer avant d'accéder à celui-ci")

    class Meta:
        db_table = 'course_modules'
        ordering = ['order']
        verbose_name = 'Module de Cours'

    def __str__(self):
        return f"{self.course_space} — {self.title}"

    def is_accessible_to(self, student):
        """
        Un module est accessible si : publié, la date de disponibilité est
        atteinte, et — s'il a un prérequis — que l'étudiant a complété la
        totalité des ressources de ce module prérequis (8.16 / H6).
        """
        from django.utils import timezone
        if not self.is_published:
            return False
        if self.available_from and self.available_from > timezone.now():
            return False
        if self.prerequisite_module_id:
            prereq_resources = self.prerequisite_module.resources.filter(is_published=True)
            if prereq_resources.exists():
                completed = ResourceCompletion.objects.filter(
                    student=student, resource__in=prereq_resources
                ).values('resource').distinct().count()
                if completed < prereq_resources.count():
                    return False
        return True


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
    version = models.PositiveSmallIntegerField(default=1)
    previous_version = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='next_versions')

    class Meta:
        db_table = 'course_resources'
        ordering = ['order']
        verbose_name = 'Ressource Pédagogique'

    def __str__(self):
        return f"{self.module} — {self.title} (v{self.version})"

    def create_new_version(self, uploaded_by, file=None, external_url=None, description=None):
        """
        Archive la ressource courante (dépubliée mais conservée pour
        historique) et crée une nouvelle version active à sa place (8.16 / H7).
        """
        self.is_published = False
        self.save(update_fields=['is_published', 'updated_at'])
        return CourseResource.objects.create(
            module=self.module, title=self.title, type=self.type,
            file=file if file is not None else self.file,
            external_url=external_url if external_url is not None else self.external_url,
            description=description if description is not None else self.description,
            order=self.order, is_downloadable=self.is_downloadable, is_published=True,
            uploaded_by=uploaded_by, version=self.version + 1, previous_version=self,
        )


class ResourceCompletion(BaseModel):
    """Marque qu'un étudiant a consulté/terminé une ressource pédagogique donnée."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='resource_completions')
    resource = models.ForeignKey(CourseResource, on_delete=models.CASCADE, related_name='completions')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lms_resource_completions'
        unique_together = ('student', 'resource')
        verbose_name = 'Complétion de Ressource'

    def __str__(self):
        return f"{self.student} — {self.resource}"


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
    # Ordre des questions figé au démarrage (anti-fraude : mélange par tentative
    # si quiz.randomize_questions est activé) — liste d'UUID sous forme de str.
    question_order = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'quiz_attempts'
        verbose_name = 'Tentative de Quiz'

    def __str__(self):
        return f"{self.student} — {self.quiz.title} (tentative {self.attempt_number})"

    @property
    def deadline(self):
        from datetime import timedelta
        return self.started_at + timedelta(minutes=self.quiz.duration_minutes)

    @property
    def is_time_expired(self):
        return timezone.now() > self.deadline

    @property
    def time_remaining_seconds(self):
        remaining = (self.deadline - timezone.now()).total_seconds()
        return max(0, int(remaining))

    def grade(self):
        """
        Corrige automatiquement les réponses QCM / Vrai-Faux (comparaison
        exacte à l'ensemble des choix corrects) et calcule le score total.
        Les questions à réponse libre (courte/longue) ne sont pas notées
        automatiquement : elles restent `is_correct=None` en attente d'une
        correction manuelle par l'enseignant, et ne comptent pas dans le
        score tant qu'elles n'ont pas été notées.
        """
        total_points = 0
        earned_points = 0
        for answer in self.answers.select_related('question').prefetch_related('selected_choices', 'question__choices'):
            question = answer.question
            total_points += float(question.points)
            if question.type in ('qcm', 'qcm_multiple', 'vrai_faux'):
                correct_ids = set(question.choices.filter(is_correct=True).values_list('id', flat=True))
                selected_ids = set(answer.selected_choices.values_list('id', flat=True))
                is_correct = selected_ids == correct_ids and len(correct_ids) > 0
                answer.is_correct = is_correct
                answer.points_earned = float(question.points) if is_correct else 0
                answer.save(update_fields=['is_correct', 'points_earned'])
                earned_points += answer.points_earned
            elif answer.points_earned is not None:
                # Réponse libre déjà corrigée manuellement par l'enseignant
                earned_points += float(answer.points_earned)

        self.score = round((earned_points / total_points) * float(self.quiz.max_grade), 2) if total_points > 0 else 0
        self.save(update_fields=['score'])
        return self.score


class StudentAnswer(BaseModel):
    """Réponse d'un étudiant à une question, pour une tentative de quiz donnée."""
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_answers')
    selected_choices = models.ManyToManyField(QuestionChoice, blank=True, related_name='selected_by')
    text_answer = models.TextField(blank=True, help_text="Réponse libre (courte/longue) — correction manuelle")
    is_correct = models.BooleanField(null=True, blank=True, help_text="None = non corrigé automatiquement")
    points_earned = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'student_answers'
        unique_together = ('attempt', 'question')
        verbose_name = 'Réponse étudiant'

    def __str__(self):
        return f"{self.attempt} — Q{self.question.order}"


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
