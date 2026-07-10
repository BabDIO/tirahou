from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.programs.models import Program


class Application(BaseModel):
    STATUS_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('soumise', 'Soumise'),
        ('en_instruction', 'En instruction'),
        ('complete', 'Dossier complet'),
        ('incomplete', 'Dossier incomplet'),
        ('admis', 'Admis'),
        ('admis_liste_attente', 'Admis (liste d\'attente)'),
        ('refuse', 'Refusé'),
        ('desiste', 'Désisté'),
        ('converti', 'Converti en inscription'),
    ]

    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='applications')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='brouillon')
    application_number = models.CharField(max_length=20, unique=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    # Informations académiques du candidat
    last_diploma = models.CharField(max_length=200, blank=True)
    last_diploma_year = models.PositiveSmallIntegerField(null=True, blank=True)
    last_institution = models.CharField(max_length=200, blank=True)
    average_grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    motivation_letter = models.TextField(blank=True)
    # Évaluation
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rank = models.PositiveIntegerField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    # Frais de dossier
    application_fee_paid = models.BooleanField(default=False)
    application_fee_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        db_table = 'applications'
        unique_together = ('applicant', 'program', 'academic_year')
        verbose_name = 'Candidature'

    def __str__(self):
        return f"{self.application_number} — {self.applicant.get_full_name()} → {self.program.code}"

    def save(self, *args, **kwargs):
        if not self.application_number:
            import uuid
            self.application_number = f"CAND-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class ApplicationDocument(BaseModel):
    DOC_TYPE_CHOICES = [
        ('cni', 'Carte Nationale d\'Identité'),
        ('passeport', 'Passeport'),
        ('diplome', 'Diplôme'),
        ('releve_notes', 'Relevé de Notes'),
        ('lettre_motivation', 'Lettre de Motivation'),
        ('cv', 'Curriculum Vitae'),
        ('photo', 'Photo d\'identité'),
        ('autre', 'Autre'),
    ]

    STATUS_CHOICES = [
        ('en_attente', 'En attente de vérification'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    ]

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    file = models.FileField(upload_to='admissions/documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    rejection_reason = models.TextField(blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'application_documents'
        verbose_name = 'Document de Candidature'

    def __str__(self):
        return f"{self.application.application_number} — {self.get_doc_type_display()}"


class AdmissionDecision(BaseModel):
    DECISION_CHOICES = [
        ('admis', 'Admis'),
        ('admis_attente', 'Admis liste d\'attente'),
        ('refuse', 'Refusé'),
    ]

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='decision')
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    decided_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    acceptance_deadline = models.DateField(null=True, blank=True)
    accepted_by_student = models.BooleanField(null=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False, help_text="Résultat publié (consultable par le candidat)")
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'admission_decisions'
        verbose_name = 'Décision d\'Admission'

    def __str__(self):
        return f"{self.application.application_number} — {self.get_decision_display()}"
