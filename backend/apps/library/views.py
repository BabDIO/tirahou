from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import LibraryDocument, Borrowing, Reservation, DocumentRating, ReadingList
from .serializers import (
    LibraryDocumentSerializer, BorrowingSerializer,
    ReservationSerializer, DocumentRatingSerializer, ReadingListSerializer,
)


# Rôles habilités à gérer le catalogue (ajout/modification/suppression
# d'une entrée) — un enseignant peut y déposer un support de cours, mais
# la gestion reste sous la responsabilité de la bibliothèque/administration.
LIBRARY_CATALOG_MANAGER_ROLES = ('bibliothecaire', 'super_admin', 'admin_institutionnel', 'enseignant')
MAX_LIBRARY_FILE_MB = 25
MAX_LIBRARY_COVER_MB = 5
ALLOWED_LIBRARY_EXTENSIONS = ('pdf', 'doc', 'docx', 'epub')
ALLOWED_COVER_EXTENSIONS = ('jpg', 'jpeg', 'png', 'webp')


def _is_catalog_manager(user):
    return user.is_superuser or user.roles.filter(name__in=LIBRARY_CATALOG_MANAGER_ROLES).exists()


def _validate_library_upload(f, allowed_extensions, max_mb):
    if not f:
        return None
    if f.size > max_mb * 1024 * 1024:
        return f'Fichier trop volumineux (max {max_mb} Mo).'
    ext = f.name.rsplit('.', 1)[-1].lower() if '.' in f.name else ''
    if ext not in allowed_extensions:
        return f"Format non autorisé (extensions acceptées : {', '.join(allowed_extensions)})."
    return None


class LibraryDocumentViewSet(viewsets.ModelViewSet):
    queryset = LibraryDocument.objects.filter(is_active=True)
    serializer_class = LibraryDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'domain', 'access_level', 'is_featured']
    search_fields = ['title', 'author', 'keywords', 'abstract', 'domain']
    ordering_fields = ['year', 'download_count', 'created_at']

    def get_permissions(self):
        # Le catalogue public (access_level='public') est consultable sans compte.
        if self.action in ('list', 'retrieve', 'featured', 'stats'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return LibraryDocument.objects.none()
        qs = LibraryDocument.objects.filter(is_active=True)
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.filter(access_level='public')
        is_privileged = user.is_superuser or user.roles.filter(
            name__in=['bibliothecaire', 'super_admin', 'admin_institutionnel', 'enseignant']
        ).exists()
        if is_privileged:
            return qs
        return qs.exclude(access_level='restricted')

    def perform_create(self, serializer):
        # Aucune restriction n'existait ici : n'importe quel compte
        # authentifié (y compris un étudiant) pouvait ajouter une entrée
        # au catalogue, avec un fichier de n'importe quelle taille/format —
        # ni perform_update/perform_destroy ci-dessous n'existaient non
        # plus, laissant modification/suppression du catalogue ouvertes à
        # tous.
        if not _is_catalog_manager(self.request.user):
            raise PermissionDenied("Réservé au personnel de la bibliothèque.")
        error = _validate_library_upload(self.request.FILES.get('file'), ALLOWED_LIBRARY_EXTENSIONS, MAX_LIBRARY_FILE_MB)
        if error:
            raise serializers.ValidationError({'file': error})
        error = _validate_library_upload(self.request.FILES.get('cover'), ALLOWED_COVER_EXTENSIONS, MAX_LIBRARY_COVER_MB)
        if error:
            raise serializers.ValidationError({'cover': error})
        serializer.save(uploaded_by=self.request.user)

    def perform_update(self, serializer):
        if not _is_catalog_manager(self.request.user):
            raise PermissionDenied("Réservé au personnel de la bibliothèque.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_catalog_manager(self.request.user):
            raise PermissionDenied("Réservé au personnel de la bibliothèque.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        doc = self.get_object()
        doc.download_count += 1
        doc.save(update_fields=['download_count'])
        return Response({'file_url': doc.file.url if doc.file else doc.external_url})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = LibraryDocument.objects.filter(is_active=True)
        data = {
            'total': qs.count(),
            'livres': qs.filter(type='livre').count(),
            'memoires': qs.filter(type='memoire').count(),
            'theses': qs.filter(type='these').count(),
            'articles': qs.filter(type='article').count(),
            'total_downloads': qs.aggregate(t=Sum('download_count'))['t'] or 0,
            'by_domain': list(qs.values('domain').annotate(count=Count('id')).order_by('-count')[:10]),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        docs = self.get_queryset().filter(is_featured=True)[:6]
        return Response(LibraryDocumentSerializer(docs, many=True, context={'request': request}).data)
    
    # AMÉLIORATIONS: Nouveaux endpoints
    
    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        """Emprunter un document"""
        document = self.get_object()

        # Deux requêtes concurrentes sur le dernier exemplaire disponible
        # passaient toutes les deux le check is_available() (lu avant tout
        # verrou), puis document.borrow() décrémentait chacune depuis la
        # même valeur en mémoire — available_quantity pouvait finir négatif
        # (plus d'emprunts actifs que d'exemplaires réels). Verrouillage de
        # la ligne + re-vérification à l'intérieur de la transaction, comme
        # pour les autres compteurs partagés du projet (wallet, capacité de
        # programme, salle de cours).
        with transaction.atomic():
            document = LibraryDocument.objects.select_for_update().get(pk=document.pk)

            if not document.is_available():
                return Response({'error': 'Document non disponible'}, status=400)

            # Vérifier si l'utilisateur a déjà emprunté ce document
            active_borrowing = Borrowing.objects.filter(
                document=document,
                borrower=request.user,
                status='en_cours'
            ).exists()

            if active_borrowing:
                return Response({'error': 'Vous avez déjà emprunté ce document'}, status=400)

            # Créer l'emprunt
            due_date = timezone.now().date() + timedelta(days=14)  # 2 semaines

            borrowing = Borrowing.objects.create(
                document=document,
                borrower=request.user,
                due_date=due_date
            )

            # Mettre à jour la disponibilité
            document.borrow()

        # Notification
        from apps.communication.models import Notification
        Notification.objects.create(
            recipient=request.user,
            title="Emprunt confirmé",
            message=f"Vous avez emprunté '{document.title}'. Date de retour: {due_date.strftime('%d/%m/%Y')}",
            type='info',
            priority='normal',
            icon='book',
            color='blue',
            is_sent=True,
            sent_at=timezone.now()
        )
        
        return Response({
            'id': borrowing.id,
            'due_date': due_date,
            'message': 'Emprunt enregistré avec succès'
        })
    
    @action(detail=True, methods=['post'])
    def reserve(self, request, pk=None):
        """Réserver un document"""
        document = self.get_object()
        
        # Vérifier si déjà réservé
        existing = Reservation.objects.filter(
            document=document,
            user=request.user,
            status__in=['en_attente', 'disponible']
        ).exists()
        
        if existing:
            return Response({'error': 'Vous avez déjà réservé ce document'}, status=400)
        
        # Calculer la position dans la file
        position = Reservation.objects.filter(
            document=document,
            status='en_attente'
        ).count() + 1
        
        reservation = Reservation.objects.create(
            document=document,
            user=request.user,
            position=position
        )
        
        return Response({
            'id': reservation.id,
            'position': position,
            'message': f'Réservation enregistrée. Position dans la file: {position}'
        })
    
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Noter un document"""
        document = self.get_object()
        rating_value = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating_value or not (1 <= int(rating_value) <= 5):
            return Response({'error': 'Note invalide (1-5)'}, status=400)
        
        rating, created = DocumentRating.objects.update_or_create(
            document=document,
            user=request.user,
            defaults={'rating': rating_value, 'comment': comment}
        )
        
        return Response({
            'message': 'Évaluation enregistrée',
            'average_rating': document.rating,
            'rating_count': document.rating_count
        })
    
    @action(detail=False, methods=['get'])
    def my_borrowings(self, request):
        """Mes emprunts en cours"""
        borrowings = Borrowing.objects.filter(
            borrower=request.user,
            status='en_cours'
        ).select_related('document')
        
        data = []
        for b in borrowings:
            # Calculer les pénalités
            b.calculate_penalty()
            
            data.append({
                'id': b.id,
                'document': {
                    'id': b.document.id,
                    'title': b.document.title,
                    'author': b.document.author,
                    'cover': b.document.cover.url if b.document.cover else None
                },
                'borrowed_at': b.borrowed_at,
                'due_date': b.due_date,
                'late_days': b.late_days,
                'penalty_amount': float(b.penalty_amount),
                'status': b.status
            })
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def my_reservations(self, request):
        """Mes réservations"""
        reservations = Reservation.objects.filter(
            user=request.user,
            status__in=['en_attente', 'disponible']
        ).select_related('document')
        
        data = [{
            'id': r.id,
            'document': {
                'id': r.document.id,
                'title': r.document.title,
                'author': r.document.author
            },
            'reserved_at': r.reserved_at,
            'position': r.position,
            'status': r.status
        } for r in reservations]
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Recommandations personnalisées"""
        # Basé sur les emprunts précédents
        user_borrowings = Borrowing.objects.filter(
            borrower=request.user
        ).values_list('document__domain', flat=True)
        
        if user_borrowings:
            # Documents du même domaine
            recommended = LibraryDocument.objects.filter(
                domain__in=user_borrowings,
                is_active=True,
                status='disponible'
            ).exclude(
                borrowings__borrower=request.user
            ).order_by('-rating', '-download_count')[:10]
        else:
            # Documents populaires
            recommended = LibraryDocument.objects.filter(
                is_active=True,
                status='disponible'
            ).order_by('-rating', '-download_count')[:10]
        
        return Response(LibraryDocumentSerializer(recommended, many=True, context={'request': request}).data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Documents populaires"""
        docs = self.get_queryset().order_by('-download_count', '-view_count')[:20]
        return Response(LibraryDocumentSerializer(docs, many=True, context={'request': request}).data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Documents récents"""
        docs = self.get_queryset().order_by('-created_at')[:20]
        return Response(LibraryDocumentSerializer(docs, many=True, context={'request': request}).data)


LIBRARY_STAFF_ROLES = ('super_admin', 'admin_institutionnel', 'bibliothecaire')


def _is_library_staff(user):
    return user.is_superuser or user.roles.filter(name__in=LIBRARY_STAFF_ROLES).exists()


class BorrowingViewSet(viewsets.ModelViewSet):
    """Gestion des emprunts — bibliothécaire + emprunts propres"""
    serializer_class = BorrowingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'document']
    ordering_fields = ['borrowed_at', 'due_date']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Borrowing.objects.none()
        user = self.request.user
        # Bibliothécaire et admin voient tout
        if user.roles.filter(name__in=['super_admin', 'admin_institutionnel', 'bibliothecaire']).exists():
            return Borrowing.objects.select_related('document', 'borrower').all()
        # Les autres ne voient que les leurs
        return Borrowing.objects.select_related('document', 'borrower').filter(borrower=user)

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """Enregistrer le retour d'un exemplaire"""
        borrowing = self.get_object()
        if borrowing.status == 'retourne':
            return Response({'detail': 'Déjà retourné.'}, status=400)
        penalty = borrowing.calculate_penalty()
        borrowing.status = 'retourne'
        borrowing.returned_at = timezone.now()
        borrowing.save(update_fields=['status', 'returned_at', 'late_days', 'penalty_amount', 'updated_at'])
        borrowing.document.return_copy()
        return Response({
            'detail': 'Retour enregistré.',
            'late_days': borrowing.late_days,
            'penalty_amount': float(penalty),
        })

    @action(detail=True, methods=['post'])
    def mark_penalty_paid(self, request, pk=None):
        # get_queryset() laisse un emprunteur voir SON PROPRE emprunt —
        # sans ce contrôle de rôle, il pouvait donc effacer lui-même sa
        # pénalité de retard via un simple POST, sans jamais l'avoir payée.
        if not _is_library_staff(request.user):
            return Response({'detail': 'Permission refusée.'}, status=403)
        borrowing = self.get_object()
        borrowing.penalty_paid = True
        borrowing.save(update_fields=['penalty_paid'])
        return Response({'detail': 'Pénalité marquée comme payée.'})

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Emprunts en retard"""
        overdue = self.get_queryset().filter(status__in=['en_cours', 'en_retard']).filter(
            due_date__lt=timezone.now().date()
        )
        for b in overdue:
            b.calculate_penalty()
        return Response(BorrowingSerializer(overdue, many=True).data)


class ReservationViewSet(viewsets.ModelViewSet):
    """Gestion des réservations"""
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'document']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Reservation.objects.none()
        user = self.request.user
        if user.roles.filter(name__in=['super_admin', 'admin_institutionnel', 'bibliothecaire']).exists():
            return Reservation.objects.select_related('document', 'user').all()
        return Reservation.objects.select_related('document', 'user').filter(user=user)

    def perform_create(self, serializer):
        document = serializer.validated_data['document']
        position = Reservation.objects.filter(
            document=document, status='en_attente'
        ).count() + 1
        serializer.save(user=self.request.user, position=position)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.user != request.user and not request.user.roles.filter(
            name__in=['super_admin', 'bibliothecaire']
        ).exists():
            return Response({'detail': 'Permission refusée.'}, status=403)
        reservation.status = 'annule'
        reservation.save()
        return Response({'detail': 'Réservation annulée.'})

    @action(detail=True, methods=['post'])
    def notify_available(self, request, pk=None):
        """Notifier l'utilisateur que le document est disponible"""
        reservation = self.get_object()
        reservation.status = 'disponible'
        reservation.available_at = timezone.now()
        reservation.notified = True
        reservation.save()
        from apps.communication.models import Notification
        Notification.objects.create(
            recipient=reservation.user,
            title="📖 Document disponible",
            message=f"'{reservation.document.title}' est maintenant disponible. Venez le récupérer.",
            type='info',
            priority='high',
            action_url='/library',
            icon='book-open',
            color='green',
            is_sent=True,
            sent_at=timezone.now()
        )
        return Response({'detail': 'Utilisateur notifié.'})


class DocumentRatingViewSet(viewsets.ModelViewSet):
    """Évaluations de documents"""
    serializer_class = DocumentRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DocumentRating.objects.none()
        return DocumentRating.objects.select_related('document', 'user').filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReadingListViewSet(viewsets.ModelViewSet):
    """Listes de lecture personnalisées"""
    serializer_class = ReadingListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_public']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ReadingList.objects.none()
        user = self.request.user
        from django.db.models import Q
        return ReadingList.objects.filter(
            Q(user=user) | Q(is_public=True)
        ).prefetch_related('documents')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_document(self, request, pk=None):
        reading_list = self.get_object()
        doc_id = request.data.get('document_id')
        try:
            doc = LibraryDocument.objects.get(id=doc_id, is_active=True)
            reading_list.documents.add(doc)
            return Response({'detail': 'Document ajouté à la liste.'})
        except LibraryDocument.DoesNotExist:
            return Response({'detail': 'Document introuvable.'}, status=404)

    @action(detail=True, methods=['post'])
    def remove_document(self, request, pk=None):
        reading_list = self.get_object()
        doc_id = request.data.get('document_id')
        try:
            doc = LibraryDocument.objects.get(id=doc_id)
            reading_list.documents.remove(doc)
            return Response({'detail': 'Document retiré.'})
        except LibraryDocument.DoesNotExist:
            return Response({'detail': 'Document introuvable.'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def library_dashboard(request):
    """Tableau de bord bibliothécaire — toutes les valeurs sont calculées depuis la base."""
    docs = LibraryDocument.objects.filter(is_active=True)
    total_documents = docs.count()
    this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = docs.filter(created_at__gte=this_month_start).count()

    type_labels = dict(LibraryDocument.TYPE_CHOICES)
    colors = ['bg-amber-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-cyan-500']
    categories = []
    for i, row in enumerate(docs.values('type').annotate(count=Count('id')).order_by('-count')[:5]):
        categories.append({
            'name': type_labels.get(row['type'], row['type']),
            'count': row['count'],
            'color': colors[i % len(colors)],
        })

    borrowings = Borrowing.objects.all()
    active_loans = borrowings.filter(status='en_cours').count()
    overdue = borrowings.filter(status__in=['en_cours', 'en_retard'], due_date__lt=timezone.now().date()).count()
    returned_this_month = borrowings.filter(status='retourne', returned_at__gte=this_month_start).count()
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    returned_last_month = borrowings.filter(status='retourne', returned_at__gte=last_month_start, returned_at__lt=this_month_start).count()
    attendance_trend = round(((returned_this_month - returned_last_month) / returned_last_month) * 100) if returned_last_month else 0

    recent_loans = []
    for b in borrowings.select_related('document', 'borrower').order_by('-borrowed_at')[:4]:
        age_days = (timezone.now() - b.borrowed_at).days
        date_label = "Aujourd'hui" if age_days == 0 else "Hier" if age_days == 1 else f"Il y a {age_days} jours"
        loan_status = 'rendu' if b.status == 'retourne' else 'en_retard' if b.status == 'en_retard' else 'en_cours'
        recent_loans.append({
            'student': b.borrower.get_full_name(),
            'title': b.document.title,
            'date': date_label,
            'status': loan_status,
        })

    return Response({
        'catalog': {
            'total_documents': total_documents,
            'new_this_month': new_this_month,
            'categories': categories,
        },
        'loans': {
            'active': active_loans,
            'overdue': overdue,
            'returned_this_month': returned_this_month,
            'attendance_trend': attendance_trend,
        },
        'recent_loans': recent_loans,
    })
