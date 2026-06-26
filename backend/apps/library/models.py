from django.db import models
from apps.core.models import BaseModel
from apps.accounts.models import User


class LibraryDocument(BaseModel):
    TYPE_CHOICES = [
        ('livre', 'Livre'),
        ('memoire', 'Mémoire'),
        ('these', 'Thèse'),
        ('article', 'Article scientifique'),
        ('guide', 'Guide pédagogique'),
        ('rapport', 'Rapport'),
        ('cours', 'Support de cours'),
        ('revue', 'Revue'),
        ('magazine', 'Magazine'),
        ('ebook', 'E-book'),
    ]

    ACCESS_CHOICES = [
        ('public', 'Public'),
        ('authenticated', 'Authentifié'),
        ('restricted', 'Restreint'),
    ]
    
    STATUS_CHOICES = [
        ('disponible', 'Disponible'),
        ('emprunte', 'Emprunté'),
        ('reserve', 'Réservé'),
        ('maintenance', 'En maintenance'),
        ('perdu', 'Perdu'),
    ]

    title = models.CharField(max_length=300)
    author = models.CharField(max_length=300)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    domain = models.CharField(max_length=100, blank=True)
    year = models.PositiveSmallIntegerField()
    isbn = models.CharField(max_length=20, blank=True)
    abstract = models.TextField(blank=True)
    keywords = models.CharField(max_length=300, blank=True)
    file = models.FileField(upload_to='library/%Y/', null=True, blank=True)
    cover = models.ImageField(upload_to='library/covers/', null=True, blank=True)
    external_url = models.URLField(blank=True)
    access_level = models.CharField(max_length=20, choices=ACCESS_CHOICES, default='authenticated')
    download_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_featured = models.BooleanField(default=False)
    
    # AMÉLIORATIONS: Gestion physique des documents
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disponible')
    quantity = models.PositiveSmallIntegerField(default=1, help_text="Nombre d'exemplaires")
    available_quantity = models.PositiveSmallIntegerField(default=1, help_text="Exemplaires disponibles")
    location = models.CharField(max_length=100, blank=True, help_text="Emplacement physique (rayon, étagère)")
    publisher = models.CharField(max_length=200, blank=True, help_text="Maison d'édition")
    edition = models.CharField(max_length=50, blank=True, help_text="Édition")
    pages = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Nombre de pages")
    language = models.CharField(max_length=50, default='Français')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, help_text="Note moyenne (0-5)")
    rating_count = models.PositiveIntegerField(default=0, help_text="Nombre d'évaluations")
    tags = models.JSONField(default=list, blank=True, help_text="Tags pour recherche")
    related_courses = models.JSONField(default=list, blank=True, help_text="Cours liés")

    class Meta:
        db_table = 'library_documents'
        verbose_name = 'Document Bibliothèque'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.author} ({self.year})"
    
    def update_rating(self):
        """Mettre à jour la note moyenne"""
        from django.db.models import Avg
        ratings = self.ratings.all()
        if ratings.exists():
            avg = ratings.aggregate(avg=Avg('rating'))['avg']
            self.rating = round(avg, 2)
            self.rating_count = ratings.count()
            self.save(update_fields=['rating', 'rating_count'])
    
    def is_available(self):
        """Vérifier si le document est disponible"""
        return self.status == 'disponible' and self.available_quantity > 0
    
    def borrow(self):
        """Emprunter un exemplaire"""
        if self.available_quantity > 0:
            self.available_quantity -= 1
            if self.available_quantity == 0:
                self.status = 'emprunte'
            self.save()
            return True
        return False
    
    def return_copy(self):
        """Retourner un exemplaire"""
        if self.available_quantity < self.quantity:
            self.available_quantity += 1
            self.status = 'disponible'
            self.save()
            return True
        return False



class Borrowing(BaseModel):
    """Emprunt de document"""
    
    STATUS_CHOICES = [
        ('en_cours', 'En cours'),
        ('retourne', 'Retourné'),
        ('en_retard', 'En retard'),
        ('perdu', 'Perdu'),
    ]
    
    document = models.ForeignKey(LibraryDocument, on_delete=models.CASCADE, related_name='borrowings')
    borrower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrowings')
    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(help_text="Date de retour prévue")
    returned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_cours')
    
    # Pénalités
    late_days = models.PositiveSmallIntegerField(default=0)
    penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    penalty_paid = models.BooleanField(default=False)
    
    # Notes
    borrower_notes = models.TextField(blank=True)
    librarian_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'library_borrowings'
        ordering = ['-borrowed_at']
    
    def __str__(self):
        return f"{self.borrower.get_full_name()} - {self.document.title}"
    
    def calculate_penalty(self):
        """Calculer les pénalités de retard"""
        from django.utils import timezone
        from datetime import timedelta
        
        if self.status == 'retourne' or not self.due_date:
            return 0
        
        today = timezone.now().date()
        if today > self.due_date:
            self.late_days = (today - self.due_date).days
            # 500 FCFA par jour de retard
            self.penalty_amount = self.late_days * 500
            self.status = 'en_retard'
            self.save()
            return self.penalty_amount
        
        return 0


class Reservation(BaseModel):
    """Réservation de document"""
    
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('disponible', 'Disponible'),
        ('recupere', 'Récupéré'),
        ('annule', 'Annulé'),
        ('expire', 'Expiré'),
    ]
    
    document = models.ForeignKey(LibraryDocument, on_delete=models.CASCADE, related_name='reservations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    reserved_at = models.DateTimeField(auto_now_add=True)
    available_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    position = models.PositiveSmallIntegerField(default=1, help_text="Position dans la file d'attente")
    notified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'library_reservations'
        ordering = ['reserved_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.document.title} (Position: {self.position})"


class DocumentRating(BaseModel):
    """Évaluation de document"""
    
    document = models.ForeignKey(LibraryDocument, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(help_text="Note de 1 à 5")
    comment = models.TextField(blank=True)
    
    class Meta:
        db_table = 'library_ratings'
        unique_together = ('document', 'user')
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.document.title}: {self.rating}/5"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mettre à jour la note moyenne du document
        self.document.update_rating()


class ReadingList(BaseModel):
    """Liste de lecture personnalisée"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reading_lists')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    documents = models.ManyToManyField(LibraryDocument, related_name='reading_lists', blank=True)
    is_public = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'library_reading_lists'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.name}"
