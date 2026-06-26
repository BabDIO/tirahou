"""
Services métier pour la bibliothèque numérique
"""
from django.utils import timezone
from django.db import transaction
from .models import LibraryDocument, Borrowing, Reservation


class LibraryService:

    @staticmethod
    @transaction.atomic
    def borrow_document(document: LibraryDocument, borrower, due_date):
        """Effectue l'emprunt d'un document."""
        if not document.is_available():
            raise ValueError(f"Le document '{document.title}' n'est pas disponible.")

        # Vérifier que l'utilisateur n'a pas déjà cet emprunt en cours
        if Borrowing.objects.filter(
            document=document, borrower=borrower, status='en_cours'
        ).exists():
            raise ValueError("Vous avez déjà un emprunt en cours pour ce document.")

        borrowing = Borrowing.objects.create(
            document=document,
            borrower=borrower,
            due_date=due_date,
            status='en_cours',
        )

        document.borrow()

        # Notification
        try:
            from apps.communication.notification_service import NotificationService
            NotificationService.send_notification(
                recipient_id=borrower.id,
                title="Emprunt enregistré 📚",
                message=f"Emprunt de '{document.title}' jusqu'au {due_date.strftime('%d/%m/%Y')}.",
                notif_type='info',
                priority='normal',
                action_url='/library',
                icon='book',
                color='blue'
            )
        except Exception:
            pass

        return borrowing

    @staticmethod
    @transaction.atomic
    def return_document(borrowing: Borrowing, returned_by=None):
        """Enregistre le retour d'un document."""
        if borrowing.status == 'retourne':
            raise ValueError("Ce document a déjà été retourné.")

        # Calculer les pénalités
        penalty = borrowing.calculate_penalty()

        borrowing.status = 'retourne'
        borrowing.returned_at = timezone.now()
        borrowing.save(update_fields=['status', 'returned_at', 'late_days', 'penalty_amount', 'updated_at'])

        borrowing.document.return_copy()

        # Notifier la prochaine réservation
        next_reservation = Reservation.objects.filter(
            document=borrowing.document,
            status='en_attente'
        ).order_by('position').first()

        if next_reservation:
            next_reservation.status = 'disponible'
            next_reservation.available_at = timezone.now()
            next_reservation.save()
            try:
                from apps.communication.notification_service import NotificationService
                NotificationService.send_notification(
                    recipient_id=next_reservation.user.id,
                    title="Document disponible 📖",
                    message=f"'{borrowing.document.title}' que vous avez réservé est maintenant disponible.",
                    notif_type='info',
                    priority='high',
                    action_url='/library',
                    icon='book-open',
                    color='green'
                )
            except Exception:
                pass

        return borrowing, penalty

    @staticmethod
    def reserve_document(document: LibraryDocument, user):
        """Place une réservation si le document est emprunté."""
        # Vérifier réservation existante
        if Reservation.objects.filter(
            document=document, user=user,
            status__in=['en_attente', 'disponible']
        ).exists():
            raise ValueError("Vous avez déjà une réservation en cours pour ce document.")

        # Calculer la position dans la file
        position = Reservation.objects.filter(
            document=document, status='en_attente'
        ).count() + 1

        return Reservation.objects.create(
            document=document,
            user=user,
            position=position,
            status='en_attente',
        )

    @staticmethod
    def get_library_stats():
        """Statistiques de la bibliothèque."""
        from django.db.models import Count, Sum

        return {
            'total_documents': LibraryDocument.objects.filter(is_active=True).count(),
            'total_borrowings': Borrowing.objects.count(),
            'active_borrowings': Borrowing.objects.filter(status='en_cours').count(),
            'overdue_borrowings': Borrowing.objects.filter(status='en_retard').count(),
            'total_reservations': Reservation.objects.filter(status='en_attente').count(),
            'total_penalties': Borrowing.objects.filter(
                penalty_amount__gt=0, penalty_paid=False
            ).aggregate(total=Sum('penalty_amount'))['total'] or 0,
            'most_borrowed': list(
                LibraryDocument.objects.annotate(
                    borrow_count=Count('borrowings')
                ).order_by('-borrow_count')[:5].values('id', 'title', 'author', 'borrow_count')
            ),
        }
