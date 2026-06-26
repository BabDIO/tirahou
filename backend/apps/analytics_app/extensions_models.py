from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.people.models import Student
from apps.programs.models import Program


class Badge(BaseModel):
    """Badges numériques (8.30.2)"""
    TYPE_CHOICES = [
        ('completion', 'Complétion de cours'),
        ('excellence', 'Excellence académique'),
        ('participation', 'Participation active'),
        ('certification', 'Certification'),
        ('skill', 'Compétence validée'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    icon = models.ImageField(upload_to='badges/icons/', null=True, blank=True)
    criteria = models.TextField(help_text='Critères d\'obtention')
    points = models.PositiveSmallIntegerField(default=10)
    is_published = models.BooleanField(default=True)

    class Meta:
        db_table = 'badges'
        verbose_name = 'Badge'

    def __str__(self):
        return self.name


class StudentBadge(BaseModel):
    """Attribution de badge à un étudiant"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    awarded_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    verification_code = models.CharField(max_length=50, unique=True, blank=True)

    class Meta:
        db_table = 'student_badges'
        unique_together = ('student', 'badge')
        verbose_name = 'Badge Étudiant'

    def save(self, *args, **kwargs):
        if not self.verification_code:
            import uuid
            self.verification_code = f"BADGE-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} — {self.badge.name}"


class MicroCertification(BaseModel):
    """Micro-certifications (8.30.2)"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('archived', 'Archivé'),
    ]

    title = models.CharField(max_length=300)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField()
    program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True)
    duration_hours = models.PositiveSmallIntegerField(default=20)
    credits = models.PositiveSmallIntegerField(default=3)
    badge = models.ForeignKey(Badge, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'micro_certifications'
        verbose_name = 'Micro-Certification'

    def __str__(self):
        return f"{self.code} — {self.title}"


class StudentCertification(BaseModel):
    """Attribution d'une micro-certification à un étudiant"""
    STATUS_CHOICES = [
        ('enrolled', 'Inscrit'),
        ('in_progress', 'En cours'),
        ('completed', 'Complété'),
        ('certified', 'Certifié'),
        ('failed', 'Échoué'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='certifications')
    certification = models.ForeignKey(MicroCertification, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    certificate_url = models.URLField(blank=True)
    verification_code = models.CharField(max_length=50, unique=True, blank=True)

    class Meta:
        db_table = 'student_certifications'
        unique_together = ('student', 'certification')
        verbose_name = 'Certification Étudiant'

    def save(self, *args, **kwargs):
        if not self.verification_code:
            import uuid
            self.verification_code = f"CERT-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} — {self.certification.title}"


class Wallet(BaseModel):
    """Portefeuille numérique interne (8.30.3)"""
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'wallets'
        verbose_name = 'Portefeuille'

    def __str__(self):
        return f"Wallet — {self.student} ({self.balance} pts)"


class WalletTransaction(BaseModel):
    """Transactions du portefeuille"""
    TYPE_CHOICES = [
        ('credit', 'Crédit'),
        ('debit', 'Débit'),
        ('reward', 'Récompense'),
        ('purchase', 'Achat'),
    ]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=300)
    reference = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'wallet_transactions'
        ordering = ['-created_at']
        verbose_name = 'Transaction Wallet'

    def __str__(self):
        return f"{self.wallet.student} — {self.type}: {self.amount}"
