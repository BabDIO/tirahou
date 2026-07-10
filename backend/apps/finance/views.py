from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from django.db import models
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import FeeType, Invoice, InvoiceItem, Payment, Scholarship, Installment
from .serializers import (
    FeeTypeSerializer, InvoiceSerializer, PaymentSerializer,
    ScholarshipSerializer, InstallmentSerializer,
)
from apps.accounts.permissions import HasModulePermission

def _recompute_invoice_totals(invoice: Invoice) -> None:
    """
    Recalcule total_amount à partir des items si présents.
    Conserve paid_amount/discount_amount.
    """
    from decimal import Decimal
    total = invoice.items.aggregate(total=models.Sum('amount')).get('total')  # type: ignore[name-defined]
    invoice.total_amount = (total or Decimal('0.00'))


class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.filter(is_active=True)
    serializer_class = FeeTypeSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'finance'
    filterset_fields = ['category', 'academic_year']


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().select_related('student', 'academic_year').prefetch_related('items', 'payments').order_by('id')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'finance'
    filterset_fields = ['status', 'academic_year', 'student']
    search_fields = ['invoice_number', 'student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Invoice.objects.none()
        user = self.request.user
        qs = Invoice.objects.select_related('student__user', 'academic_year').prefetch_related('items', 'payments', 'installments')
        # Étudiant : seulement ses propres factures
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        # Enseignant : aucun accès aux factures
        if hasattr(user, 'teacher_profile'):
            return Invoice.objects.none()
        return qs.order_by('id')

    def perform_create(self, serializer):
        invoice = serializer.save()
        # Si des items existent (créés via admin ou autre), aligner le total
        if invoice.items.exists():
            _recompute_invoice_totals(invoice)
            invoice.save(update_fields=['total_amount', 'updated_at'])

    def perform_update(self, serializer):
        invoice = serializer.save()
        # Garder total_amount cohérent si items gérés
        if invoice.items.exists():
            _recompute_invoice_totals(invoice)
            invoice.save(update_fields=['total_amount', 'updated_at'])

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'annulee':
            return Response({'detail': 'Facture annulée.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save(invoice=invoice, validated_by=request.user, paid_at=timezone.now(), status='valide')
            invoice.paid_amount += payment.amount
            if invoice.paid_amount >= invoice.total_amount - invoice.discount_amount:
                invoice.status = 'payee'
            else:
                invoice.status = 'partiellement_payee'
            invoice.save()
            try:
                from apps.core.tasks import dispatch_webhook
                dispatch_webhook('payment.received', {
                    'invoice_number': invoice.invoice_number, 'student_id': str(invoice.student_id),
                    'amount': float(payment.amount), 'method': payment.method, 'invoice_status': invoice.status,
                })
            except Exception:
                pass
            return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def pay_online(self, request, pk=None):
        """
        Démarre un paiement mobile money en ligne (8.12 / E7) — l'étudiant
        est redirigé vers `payment_url` pour saisir son code sur son
        opérateur. Nécessite CINETPAY_API_KEY/CINETPAY_SITE_ID (voir
        apps.finance.payment_gateway) ; sinon renvoie une erreur explicite
        invitant à payer en caisse.
        """
        from .payment_gateway import initiate_mobile_money_payment
        invoice = self.get_object()
        phone = request.data.get('phone')
        operator = request.data.get('operator', 'OM')
        if not phone:
            return Response({'error': 'Numéro de téléphone requis.'}, status=status.HTTP_400_BAD_REQUEST)
        result = initiate_mobile_money_payment(invoice, invoice.remaining_amount, phone, operator)
        if not result['success']:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'payment_url': result['payment_url'], 'transaction_id': result['transaction_id']})

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'fee_type': {'type': 'string', 'nullable': True, 'description': 'UUID FeeType (optionnel)'},
                    'label': {'type': 'string'},
                    'amount': {'type': 'number'},
                },
                'required': ['label', 'amount'],
            }
        },
        responses={201: OpenApiResponse(description='Ligne ajoutée'), 400: OpenApiResponse(description='Erreur')},
    )
    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        """
        Ajoute une ligne à la facture puis recalcule le total.
        """
        from decimal import Decimal, InvalidOperation

        invoice = self.get_object()
        if invoice.status in ['payee', 'annulee']:
            return Response({'detail': 'Facture non modifiable.'}, status=status.HTTP_400_BAD_REQUEST)

        label = str(request.data.get('label', '')).strip()
        if not label:
            return Response({'detail': 'Label requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(request.data.get('amount', 0) or 0))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'detail': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= Decimal('0'):
            return Response({'detail': 'Montant doit être > 0.'}, status=status.HTTP_400_BAD_REQUEST)

        fee_type_id = request.data.get('fee_type')
        fee_type = None
        if fee_type_id:
            fee_type = FeeType.objects.filter(id=fee_type_id).first()

        InvoiceItem.objects.create(invoice=invoice, fee_type=fee_type, label=label, amount=amount)
        _recompute_invoice_totals(invoice)
        # Revalider le statut en fonction des paiements/remises actuels
        if invoice.paid_amount >= (invoice.total_amount - invoice.discount_amount):
            invoice.status = 'payee'
        elif invoice.paid_amount > 0:
            invoice.status = 'partiellement_payee'
        else:
            invoice.status = 'emise'
        invoice.save(update_fields=['total_amount', 'status', 'updated_at'])
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: OpenApiResponse(description='Ligne supprimée'), 404: OpenApiResponse(description='Introuvable')},
    )
    @action(detail=True, methods=['delete'], url_path=r'items/(?P<item_id>[^/.]+)')
    def delete_item(self, request, pk=None, item_id=None):
        """
        Supprime une ligne puis recalcule le total.
        """
        invoice = self.get_object()
        if invoice.status in ['payee', 'annulee']:
            return Response({'detail': 'Facture non modifiable.'}, status=status.HTTP_400_BAD_REQUEST)

        item = invoice.items.filter(id=item_id).first()
        if not item:
            return Response({'detail': 'Ligne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()

        _recompute_invoice_totals(invoice)
        if invoice.paid_amount >= (invoice.total_amount - invoice.discount_amount):
            invoice.status = 'payee'
        elif invoice.paid_amount > 0:
            invoice.status = 'partiellement_payee'
        else:
            invoice.status = 'emise'
        invoice.save(update_fields=['total_amount', 'status', 'updated_at'])
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Annule une facture (soft) — bloque paiements et modifications.
        """
        invoice = self.get_object()
        if invoice.status == 'payee':
            return Response({'detail': 'Impossible d’annuler une facture payée.'}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = 'annulee'
        invoice.save(update_fields=['status', 'updated_at'])
        return Response({'detail': 'Facture annulée.'})

    @extend_schema(responses={200: OpenApiResponse(description='Facture PDF')})
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Télécharge la facture en PDF.
        """
        invoice = self.get_object()
        items = list(invoice.items.all())

        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        c.setFont('Helvetica-Bold', 16)
        c.drawString(2*cm, h - 2.5*cm, 'FACTURE')
        c.setFont('Helvetica', 10)
        c.drawRightString(w - 2*cm, h - 2.5*cm, invoice.invoice_number)

        y = h - 3.5*cm
        c.setFont('Helvetica', 9)
        c.drawString(2*cm, y, f"Étudiant: {invoice.student.user.get_full_name()} ({invoice.student.student_id})")
        y -= 12
        c.drawString(2*cm, y, f"Année académique: {invoice.academic_year.label}")
        y -= 12
        if invoice.due_date:
            c.drawString(2*cm, y, f"Échéance: {invoice.due_date.strftime('%d/%m/%Y')}")
            y -= 12
        c.drawString(2*cm, y, f"Statut: {invoice.get_status_display()}")
        y -= 18

        # Table header
        c.setFont('Helvetica-Bold', 9)
        c.drawString(2*cm, y, "Libellé")
        c.drawRightString(w - 3*cm, y, "Montant")
        y -= 10
        c.line(2*cm, y, w - 2*cm, y)
        y -= 14

        c.setFont('Helvetica', 9)
        if not items:
            c.drawString(2*cm, y, "— (Aucune ligne) —")
            y -= 14
        else:
            for it in items:
                if y < 4*cm:
                    c.showPage()
                    y = h - 2.5*cm
                    c.setFont('Helvetica-Bold', 9)
                    c.drawString(2*cm, y, "Libellé")
                    c.drawRightString(w - 3*cm, y, "Montant")
                    y -= 10
                    c.line(2*cm, y, w - 2*cm, y)
                    y -= 14
                    c.setFont('Helvetica', 9)
                c.drawString(2*cm, y, (it.label or '')[:70])
                c.drawRightString(w - 3*cm, y, f"{it.amount} FCFA")
                y -= 14

        y -= 8
        c.line(2*cm, y, w - 2*cm, y)
        y -= 18

        # Totals
        c.setFont('Helvetica-Bold', 10)
        c.drawRightString(w - 3*cm, y, f"Total: {invoice.total_amount} FCFA")
        y -= 14
        c.setFont('Helvetica', 10)
        c.drawRightString(w - 3*cm, y, f"Payé: {invoice.paid_amount} FCFA")
        y -= 14
        c.drawRightString(w - 3*cm, y, f"Remise: {invoice.discount_amount} FCFA")
        y -= 14
        c.setFont('Helvetica-Bold', 11)
        c.drawRightString(w - 3*cm, y, f"Reste: {invoice.remaining_amount} FCFA")

        c.showPage()
        c.save()
        buf.seek(0)

        resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return resp

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from django.db.models import Sum
        total = Invoice.objects.aggregate(
            total=Sum('total_amount'),
            paid=Sum('paid_amount'),
        )
        return Response(total)

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'invoice': {'type': 'string', 'description': 'UUID facture ou numéro FACT-XXXX'},
                    'type': {'type': 'string', 'description': 'bourse/exoneration/remise/ristourne'},
                    'amount': {'type': 'number'},
                    'reason': {'type': 'string'},
                },
                'required': ['invoice', 'amount'],
            }
        },
        responses={200: InvoiceSerializer, 400: OpenApiResponse(description='Requête invalide'), 404: OpenApiResponse(description='Facture introuvable')},
    )
    @action(detail=False, methods=['post'], url_path='apply_discount')
    def apply_discount(self, request):
        """
        Applique une réduction à une facture.
        Supporte l'identifiant UUID (id) OU le numéro de facture (invoice_number).
        """
        invoice_ref = str(request.data.get('invoice', '')).strip()
        if not invoice_ref:
            return Response({'detail': 'Champ invoice requis.'}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal, InvalidOperation
        try:
            amount = Decimal(str(request.data.get('amount', 0) or 0))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'detail': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= Decimal('0'):
            return Response({'detail': 'Montant doit être > 0.'}, status=status.HTTP_400_BAD_REQUEST)

        # Éviter ValidationError si invoice_ref n'est pas un UUID
        invoice = None
        try:
            import uuid
            uuid.UUID(invoice_ref)
            invoice = Invoice.objects.filter(id=invoice_ref).first()
        except Exception:
            invoice = None

        if invoice is None:
            invoice = Invoice.objects.filter(invoice_number=invoice_ref).first()
        if invoice is None:
            return Response({'detail': 'Facture introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Clamp: la réduction totale ne doit pas dépasser le restant dû.
        remaining = invoice.total_amount - invoice.paid_amount - invoice.discount_amount
        if amount > remaining:
            return Response(
                {'detail': f"Montant trop élevé. Restant maximum: {remaining}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.discount_amount = invoice.discount_amount + amount
        # Mettre à jour le statut si la facture devient soldée
        if invoice.paid_amount >= (invoice.total_amount - invoice.discount_amount):
            invoice.status = 'payee'
        invoice.save(update_fields=['discount_amount', 'status', 'updated_at'])

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('invoice').order_by('id')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'finance'
    filterset_fields = ['status', 'method']
    search_fields = ['receipt_number', 'transaction_ref']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Payment.objects.none()
        user = self.request.user
        qs = Payment.objects.select_related('invoice__student__user')
        # Étudiant : ses paiements uniquement
        if hasattr(user, 'student_profile'):
            return qs.filter(invoice__student=user.student_profile)
        # Enseignant : aucun accès
        if hasattr(user, 'teacher_profile'):
            return Payment.objects.none()
        return qs.order_by('id')

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider un paiement (workflow manuel)."""
        payment = self.get_object()
        if payment.status == 'valide':
            return Response({'detail': 'Paiement déjà validé.'})
        if payment.status in ['rembourse']:
            return Response({'detail': 'Paiement remboursé — non validable.'}, status=status.HTTP_400_BAD_REQUEST)

        payment.status = 'valide'
        payment.validated_by = request.user
        payment.paid_at = payment.paid_at or timezone.now()
        payment.save(update_fields=['status', 'validated_by', 'paid_at', 'updated_at'])

        invoice = payment.invoice
        invoice.paid_amount = (invoice.paid_amount or 0) + payment.amount
        if invoice.paid_amount >= invoice.total_amount - invoice.discount_amount:
            invoice.status = 'payee'
        else:
            invoice.status = 'partiellement_payee'
        invoice.save(update_fields=['paid_amount', 'status', 'updated_at'])

        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter un paiement (ex: preuve invalide, transaction échouée)."""
        payment = self.get_object()
        if payment.status == 'valide':
            return Response({'detail': 'Paiement déjà validé — utilisez remboursement si nécessaire.'}, status=status.HTTP_400_BAD_REQUEST)
        if payment.status == 'rejete':
            return Response({'detail': 'Paiement déjà rejeté.'})
        payment.status = 'rejete'
        payment.notes = (request.data.get('reason') or request.data.get('notes') or payment.notes or '').strip()
        payment.validated_by = request.user
        payment.save(update_fields=['status', 'notes', 'validated_by', 'updated_at'])
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Rembourser un paiement validé et ajuster la facture."""
        payment = self.get_object()
        if payment.status != 'valide':
            return Response({'detail': 'Seuls les paiements validés peuvent être remboursés.'}, status=status.HTTP_400_BAD_REQUEST)

        invoice = payment.invoice
        # Mise à jour paiement
        payment.status = 'rembourse'
        payment.notes = (request.data.get('reason') or request.data.get('notes') or payment.notes or '').strip()
        payment.validated_by = request.user
        payment.save(update_fields=['status', 'notes', 'validated_by', 'updated_at'])

        # Ajuster la facture
        invoice.paid_amount = (invoice.paid_amount or 0) - payment.amount
        if invoice.paid_amount < 0:
            invoice.paid_amount = 0
        if invoice.paid_amount >= invoice.total_amount - invoice.discount_amount:
            invoice.status = 'payee'
        elif invoice.paid_amount > 0:
            invoice.status = 'partiellement_payee'
        else:
            invoice.status = 'emise'
        invoice.save(update_fields=['paid_amount', 'status', 'updated_at'])

        return Response(PaymentSerializer(payment).data)

    @extend_schema(responses={200: OpenApiResponse(description='Reçu de paiement (PDF)')})
    @action(detail=True, methods=['get'], url_path='receipt_pdf')
    def receipt_pdf(self, request, pk=None):
        """Télécharger un reçu (quittance) PDF pour un paiement."""
        payment = self.get_object()
        invoice = payment.invoice
        student = invoice.student

        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        c.setFont('Helvetica-Bold', 16)
        c.drawString(2*cm, h - 2.5*cm, 'REÇU DE PAIEMENT')
        c.setFont('Helvetica', 10)
        c.drawRightString(w - 2*cm, h - 2.5*cm, payment.receipt_number or '')

        y = h - 3.6*cm
        c.setFont('Helvetica', 9)
        c.drawString(2*cm, y, f"Facture: {invoice.invoice_number}")
        y -= 12
        c.drawString(2*cm, y, f"Étudiant: {student.user.get_full_name()} ({student.student_id})")
        y -= 12
        c.drawString(2*cm, y, f"Année académique: {invoice.academic_year.label}")
        y -= 12
        c.drawString(2*cm, y, f"Date: {(payment.paid_at or timezone.now()).strftime('%d/%m/%Y %H:%M')}")
        y -= 18

        c.setFont('Helvetica-Bold', 10)
        c.drawString(2*cm, y, "Détails du paiement")
        y -= 14
        c.setFont('Helvetica', 10)
        c.drawString(2*cm, y, f"Montant: {payment.amount} FCFA")
        y -= 12
        c.drawString(2*cm, y, f"Mode: {payment.get_method_display()}")
        y -= 12
        c.drawString(2*cm, y, f"Statut: {payment.get_status_display()}")
        y -= 20

        c.setFont('Helvetica-Bold', 10)
        c.drawString(2*cm, y, "Récapitulatif facture")
        y -= 14
        c.setFont('Helvetica', 10)
        c.drawString(2*cm, y, f"Total: {invoice.total_amount} FCFA")
        y -= 12
        c.drawString(2*cm, y, f"Payé: {invoice.paid_amount} FCFA")
        y -= 12
        c.drawString(2*cm, y, f"Remise: {invoice.discount_amount} FCFA")
        y -= 12
        c.setFont('Helvetica-Bold', 11)
        c.drawString(2*cm, y, f"Reste: {invoice.remaining_amount} FCFA")

        c.showPage()
        c.save()
        buf.seek(0)

        resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
        filename = f"{payment.receipt_number or 'recu'}.pdf"
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp


class ScholarshipViewSet(viewsets.ModelViewSet):
    queryset = Scholarship.objects.all().order_by('id')
    serializer_class = ScholarshipSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'finance'
    filterset_fields = ['type', 'academic_year', 'student']


class InstallmentViewSet(viewsets.ModelViewSet):
    queryset = Installment.objects.all().select_related('invoice').order_by('id')
    serializer_class = InstallmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'finance'
    filterset_fields = ['invoice', 'status']

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        installment = self.get_object()
        installment.status = 'paye'
        installment.paid_at = timezone.now()
        installment.save()
        return Response({'detail': 'Échéance marquée payée.'})


@extend_schema(responses={200: OpenApiResponse(description='Journal de caisse')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cash_journal(request):
    """Journal de caisse — liste des paiements avec filtres date."""
    from django.db.models import Sum
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    qs = Payment.objects.filter(status='valide').select_related('invoice__student')
    if start:
        qs = qs.filter(paid_at__date__gte=start)
    if end:
        qs = qs.filter(paid_at__date__lte=end)
    total = qs.aggregate(total=Sum('amount'))['total'] or 0
    data = {
        'total': total,
        'count': qs.count(),
        'payments': PaymentSerializer(qs.order_by('-paid_at')[:100], many=True).data,
    }
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def cinetpay_notify(request):
    """
    Callback serveur-à-serveur CinetPay (E7) : appelé par CinetPay lui-même
    (pas par le navigateur), donc AllowAny — la sécurité repose sur la
    vérification du statut via `verify_transaction` (jamais sur les données
    brutes du POST, qui pourraient être falsifiées).
    """
    from .payment_gateway import verify_transaction
    transaction_id = request.data.get('cpm_trans_id') or request.data.get('transaction_id')
    if not transaction_id:
        return Response({'error': 'transaction_id manquant'}, status=status.HTTP_400_BAD_REQUEST)

    result = verify_transaction(transaction_id)
    if not result['success']:
        return Response({'detail': 'Transaction non confirmée', 'status': result['status']})

    try:
        invoice_number = transaction_id.split('-')[1]
        invoice = Invoice.objects.get(invoice_number=invoice_number)
    except (IndexError, Invoice.DoesNotExist):
        return Response({'error': 'Facture introuvable pour cette transaction'}, status=status.HTTP_404_NOT_FOUND)

    if not Payment.objects.filter(transaction_ref=transaction_id).exists():
        amount = invoice.remaining_amount
        payment = Payment.objects.create(
            invoice=invoice, amount=amount, method='mobile_money',
            transaction_ref=transaction_id, status='valide', paid_at=timezone.now(),
        )
        invoice.paid_amount += payment.amount
        invoice.status = 'payee' if invoice.paid_amount >= invoice.total_amount - invoice.discount_amount else 'partiellement_payee'
        invoice.save()

    return Response({'detail': 'Paiement confirmé.'})
