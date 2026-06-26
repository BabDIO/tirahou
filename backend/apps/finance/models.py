from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User
from apps.academic.models import AcademicYear
from apps.people.models import Student


class FeeType(BaseModel):
    CATEGORY_CHOICES = [
        ('candidature', 'Frais de candidature'),
        ('inscription', 'Frais d\'inscription'),
        ('reinscription', 'Frais de réinscription'),
        ('attestation', 'Attestation'),
        ('releve_notes', 'Relevé de notes'),
        ('soutenance', 'Soutenance'),
        ('certificat', 'Certificat'),
        ('service', 'Service complémentaire'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='fee_types')
    is_mandatory = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'fee_types'
        verbose_name = 'Type de Frais'

    def __str__(self):
        return f"{self.name} — {self.amount} FCFA"


class Invoice(BaseModel):
    STATUS_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('emise', 'Émise'),
        ('partiellement_payee', 'Partiellement payée'),
        ('payee', 'Payée'),
        ('annulee', 'Annulée'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='invoices')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=20, unique=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='emise')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'invoices'
        verbose_name = 'Facture'

    def __str__(self):
        return f"{self.invoice_number} — {self.student}"

    @property
    def remaining_amount(self):
        return self.total_amount - self.paid_amount - self.discount_amount

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            import uuid
            self.invoice_number = f"FACT-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class InvoiceItem(BaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    fee_type = models.ForeignKey(FeeType, on_delete=models.SET_NULL, null=True)
    label = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'


class Payment(BaseModel):
    METHOD_CHOICES = [
        ('mobile_money', 'Mobile Money'),
        ('carte_bancaire', 'Carte Bancaire'),
        ('virement', 'Virement Bancaire'),
        ('caisse', 'Caisse'),
        ('cheque', 'Chèque'),
    ]

    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
        ('rembourse', 'Remboursé'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    transaction_ref = models.CharField(max_length=100, blank=True)
    receipt_number = models.CharField(max_length=20, unique=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'payments'
        verbose_name = 'Paiement'

    def __str__(self):
        return f"{self.receipt_number} — {self.amount} FCFA"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import uuid
            self.receipt_number = f"RECU-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class Scholarship(BaseModel):
    TYPE_CHOICES = [
        ('bourse', 'Bourse'),
        ('exoneration', 'Exonération'),
        ('remise', 'Remise'),
        ('ristourne', 'Ristourne'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='scholarships')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reason = models.TextField(blank=True)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'scholarships'
        verbose_name = 'Bourse / Exonération'

    def __str__(self):
        return f"{self.student} — {self.get_type_display()}"


class Installment(BaseModel):
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('paye', 'Payé'),
        ('en_retard', 'En retard'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='installments')
    number = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'installments'
        ordering = ['number']
        verbose_name = 'Échéance'

    def __str__(self):
        return f"{self.invoice.invoice_number} — Échéance {self.number}"
