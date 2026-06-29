from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import LibraryDocument, Borrowing, Reservation, DocumentRating, ReadingList
from .serializers import (
    LibraryDocumentSerializer, BorrowingSerializer,
    ReservationSerializer, DocumentRatingSerializer, ReadingListSerializer,
)


class LibraryDocumentViewSet(viewsets.ModelViewSet):
    queryset = LibraryDocument.objects.filter(is_active=True)
    serializer_class = LibraryDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'domain', 'access_level', 'is_featured']
    search_fields = ['title', 'author', 'keywords', 'abstract', 'domain']
    ordering_fields = ['year', 'download_count', 'created_at']

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

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
