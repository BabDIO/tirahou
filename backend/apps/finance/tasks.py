"""
Tâches Celery pour le module Finance
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import Invoice
from apps.communication.models import Notification


@shared_task
def send_payment_reminders():
    """
    Envoie des rappels de paiement pour les factures impayées
    """
    today = timezone.now().date()
    
    # Factures impayées avec échéance dépassée
    overdue_invoices = Invoice.objects.filter(
        status='en_attente',
        due_date__lt=today
    ).select_related('student')
    
    # Factures avec échéance dans 7 jours
    upcoming_invoices = Invoice.objects.filter(
        status='en_attente',
        due_date=today + timedelta(days=7)
    ).select_related('student')
    
    count_overdue = 0
    count_upcoming = 0
    
    # Rappels pour factures en retard
    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days
        Notification.objects.create(
            recipient=invoice.student.user,
            title="Paiement en retard",
            message=f"Votre facture #{invoice.invoice_number} est en retard de {days_overdue} jours. "
                   f"Montant dû: {invoice.total_amount} FCFA. Veuillez régulariser votre situation.",
            notification_type='payment',
            priority='high'
        )
        count_overdue += 1
    
    # Rappels pour factures à venir
    for invoice in upcoming_invoices:
        Notification.objects.create(
            recipient=invoice.student.user,
            title="Échéance de paiement",
            message=f"Votre facture #{invoice.invoice_number} arrive à échéance dans 7 jours. "
                   f"Montant: {invoice.total_amount} FCFA. Date limite: {invoice.due_date.strftime('%d/%m/%Y')}.",
            notification_type='payment',
            priority='medium'
        )
        count_upcoming += 1
    
    return {
        'overdue_reminders': count_overdue,
        'upcoming_reminders': count_upcoming,
        'total': count_overdue + count_upcoming
    }


@shared_task
def calculate_monthly_revenue():
    """
    Calcule le revenu mensuel et génère un rapport
    """
    today = timezone.now()
    first_day = today.replace(day=1)
    
    # Factures payées ce mois
    paid_invoices = Invoice.objects.filter(
        status='payee',
        payment_date__gte=first_day,
        payment_date__lt=today
    )
    
    total_revenue = sum(inv.total_amount for inv in paid_invoices)
    invoice_count = paid_invoices.count()
    
    return {
        'month': today.strftime('%B %Y'),
        'total_revenue': float(total_revenue),
        'invoice_count': invoice_count,
        'average_amount': float(total_revenue / invoice_count) if invoice_count > 0 else 0
    }


@shared_task
def auto_apply_late_fees():
    """
    Applique automatiquement des pénalités de retard
    """
    today = timezone.now().date()
    late_fee_rate = 0.05  # 5% de pénalité par mois de retard
    
    overdue_invoices = Invoice.objects.filter(
        status='en_attente',
        due_date__lt=today,
        late_fee_applied=False
    )
    
    count = 0
    for invoice in overdue_invoices:
        months_late = (today.year - invoice.due_date.year) * 12 + today.month - invoice.due_date.month
        if months_late > 0:
            late_fee = invoice.total_amount * late_fee_rate * months_late
            invoice.total_amount += late_fee
            invoice.late_fee_applied = True
            invoice.save()
            
            # Notifier l'étudiant
            Notification.objects.create(
                recipient=invoice.student.user,
                title="Pénalité de retard appliquée",
                message=f"Une pénalité de {late_fee} FCFA a été ajoutée à votre facture #{invoice.invoice_number} "
                       f"pour retard de paiement de {months_late} mois.",
                notification_type='payment',
                priority='high'
            )
            count += 1
    
    return {'late_fees_applied': count}
