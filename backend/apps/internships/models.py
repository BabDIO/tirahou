from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.people.models import Student, Teacher


class Internship(BaseModel):
    STATUS_CHOICES = [
        ('en_recherche', 'En recherche'),
        ('convention_signee', 'Convention signée'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('valide', 'Validé'),
        ('abandonne', 'Abandonné'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='internships')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_internships')
    company_name = models.CharField(max_length=200)
    company_address = models.TextField(blank=True)
    company_supervisor = models.CharField(max_length=200, blank=True)
    company_supervisor_email = models.EmailField(blank=True)
    subject = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_recherche')
    convention_file = models.FileField(upload_to='internships/conventions/', null=True, blank=True)
    report_file = models.FileField(upload_to='internships/reports/', null=True, blank=True)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'internships'
        verbose_name = 'Stage'

    def __str__(self):
        return f"{self.student} — {self.company_name} ({self.academic_year})"


class Thesis(BaseModel):
    TYPE_CHOICES = [
        ('memoire_licence', 'Mémoire de Licence'),
        ('memoire_master', 'Mémoire de Master'),
        ('these_doctorat', 'Thèse de Doctorat'),
    ]

    STATUS_CHOICES = [
        ('sujet_propose', 'Sujet proposé'),
        ('sujet_valide', 'Sujet validé'),
        ('en_redaction', 'En rédaction'),
        ('depose', 'Déposé'),
        ('soutenu', 'Soutenu'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='theses')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=300)
    abstract = models.TextField(blank=True)
    keywords = models.CharField(max_length=300, blank=True)
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='supervised_theses')
    co_supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='co_supervised_theses')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sujet_propose')
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_theses')
    validated_at = models.DateTimeField(null=True, blank=True)
    final_file = models.FileField(upload_to='theses/final/', null=True, blank=True)
    plagiarism_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    plagiarism_analysis_id = models.CharField(max_length=100, blank=True)
    plagiarism_report_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = 'theses'
        verbose_name = 'Mémoire / Thèse'

    def __str__(self):
        return f"{self.student} — {self.title[:60]}"


class ThesisProgress(BaseModel):
    thesis = models.ForeignKey(Thesis, on_delete=models.CASCADE, related_name='progress_logs')
    date = models.DateField()
    note = models.TextField()
    file = models.FileField(upload_to='theses/progress/', null=True, blank=True)
    logged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'thesis_progress'
        ordering = ['-date']
        verbose_name = 'Suivi de Mémoire'


class Defense(BaseModel):
    STATUS_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('realisee', 'Réalisée'),
        ('reportee', 'Reportée'),
        ('annulee', 'Annulée'),
    ]

    thesis = models.OneToOneField(Thesis, on_delete=models.CASCADE, related_name='defense')
    scheduled_date = models.DateTimeField()
    room = models.CharField(max_length=100, blank=True)
    virtual_link = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planifiee')
    jury_president = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='defense_president')
    jury_members = models.ManyToManyField(User, blank=True, related_name='defense_jury')
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    mention = models.CharField(max_length=50, blank=True)
    pv_file = models.FileField(upload_to='defenses/pv/', null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'defenses'
        verbose_name = 'Soutenance'

    def __str__(self):
        return f"Soutenance — {self.thesis.student} ({self.scheduled_date.date()})"
