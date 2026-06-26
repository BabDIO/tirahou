from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student


class DocumentCategory(BaseModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    requires_validation = models.BooleanField(default=False)

    class Meta:
        db_table = 'document_categories'
        verbose_name = 'Catégorie de Document'

    def __str__(self):
        return self.name


class StudentDocument(BaseModel):
    STATUS_CHOICES = [
        ('depose', 'Déposé'),
        ('en_verification', 'En vérification'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
        ('archive', 'Archivé'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='documents')
    category = models.ForeignKey(DocumentCategory, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='ged/students/%Y/%m/')
    file_size = models.PositiveIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    version = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='depose')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_docs')
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_docs')
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'student_documents'
        verbose_name = 'Document Étudiant'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student} — {self.title} (v{self.version})"


class GeneratedDocument(BaseModel):
    DOC_TYPE_CHOICES = [
        ('fiche_inscription', 'Fiche d\'inscription'),
        ('certificat_scolarite', 'Certificat de scolarité'),
        ('certificat_frequentation', 'Certificat de fréquentation'),
        ('attestation_reussite', 'Attestation de réussite'),
        ('releve_notes', 'Relevé de notes'),
        ('bulletin', 'Bulletin'),
        ('convocation', 'Convocation'),
        ('carte_etudiant', 'Carte d\'étudiant'),
        ('diplome', 'Diplôme'),
        ('attestation_fin_cycle', 'Attestation de fin de cycle'),
        ('pv_deliberation', 'PV de délibération'),
    ]

    STATUS_CHOICES = [
        ('genere', 'Généré'),
        ('signe', 'Signé'),
        ('delivre', 'Délivré'),
        ('annule', 'Annulé'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='generated_documents')
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='generated/%Y/%m/', null=True, blank=True)
    verification_code = models.CharField(max_length=50, unique=True, blank=True)
    qr_code = models.ImageField(upload_to='qrcodes/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='genere')
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'generated_documents'
        verbose_name = 'Document Généré'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student} — {self.get_doc_type_display()}"

    def save(self, *args, **kwargs):
        if not self.verification_code:
            import uuid
            self.verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class DocumentAccessLog(models.Model):
    document = models.ForeignKey(GeneratedDocument, on_delete=models.CASCADE, related_name='access_logs')
    accessed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    accessed_at = models.DateTimeField(auto_now_add=True)
    verification_method = models.CharField(max_length=20, default='qr_code')

    class Meta:
        db_table = 'document_access_logs'
        ordering = ['-accessed_at']
