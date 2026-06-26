"""
Services métier pour la gestion des inscriptions
"""
from django.utils import timezone
from django.db import transaction
from .models import AdminEnrollment, PedaEnrollment, UEEnrollment


class EnrollmentService:

    @staticmethod
    @transaction.atomic
    def validate_admin_enrollment(enrollment: AdminEnrollment, validated_by):
        """Valide une inscription administrative et crée la facture si nécessaire."""
        if enrollment.status == 'validee':
            raise ValueError("L'inscription est déjà validée.")

        enrollment.status = 'validee'
        enrollment.validated_by = validated_by
        enrollment.validated_at = timezone.now()
        enrollment.save(update_fields=['status', 'validated_by', 'validated_at', 'updated_at'])

        # Mettre à jour le statut étudiant
        student = enrollment.student
        if student.status == 'admis':
            student.status = 'inscrit'
            student.current_program = enrollment.program
            student.current_year = enrollment.academic_year
            student.save(update_fields=['status', 'current_program', 'current_year', 'updated_at'])
        elif student.status == 'inscrit':
            student.status = 'reinscrit'
            student.current_year = enrollment.academic_year
            student.save(update_fields=['status', 'current_year', 'updated_at'])

        # Générer automatiquement la facture si le programme a des frais
        program = enrollment.program
        if program.fees > 0:
            EnrollmentService._create_tuition_invoice(enrollment)

        # Notification
        try:
            from apps.communication.notification_service import NotificationService
            NotificationService.send_notification(
                recipient_id=student.user.id,
                title="Inscription validée ✓",
                message=f"Votre inscription en {program.name} pour l'année {enrollment.academic_year.label} a été validée.",
                notif_type='inscription',
                priority='high',
                action_url='/my-enrollment',
                icon='check-circle',
                color='green'
            )
        except Exception:
            pass

        return enrollment

    @staticmethod
    def _create_tuition_invoice(enrollment: AdminEnrollment):
        """Crée la facture de frais de scolarité pour une inscription."""
        from apps.finance.models import Invoice, InvoiceItem, FeeType

        # Vérifier qu'une facture n'existe pas déjà
        from apps.finance.models import Invoice as Inv
        if Inv.objects.filter(student=enrollment.student, academic_year=enrollment.academic_year).exists():
            return None

        invoice = Invoice.objects.create(
            student=enrollment.student,
            academic_year=enrollment.academic_year,
            status='emise',
            total_amount=enrollment.program.fees,
        )

        # Chercher le type de frais correspondant
        fee_type = FeeType.objects.filter(
            academic_year=enrollment.academic_year,
            category='inscription' if enrollment.type == 'premiere_inscription' else 'reinscription',
        ).first()

        InvoiceItem.objects.create(
            invoice=invoice,
            fee_type=fee_type,
            label=f"Frais de scolarité — {enrollment.program.name}",
            amount=enrollment.program.fees,
        )

        return invoice

    @staticmethod
    @transaction.atomic
    def confirm_peda_enrollment(peda_enrollment: PedaEnrollment):
        """Confirme une inscription pédagogique et inscrit aux UE du semestre."""
        if peda_enrollment.status == 'confirmee':
            raise ValueError("L'inscription pédagogique est déjà confirmée.")

        peda_enrollment.status = 'confirmee'
        peda_enrollment.confirmed_at = timezone.now()
        peda_enrollment.save(update_fields=['status', 'confirmed_at', 'updated_at'])

        # Inscrire automatiquement aux UE fondamentales et transversales
        ues = peda_enrollment.semester.ues.filter(
            type__in=['fondamentale', 'transversale'],
            is_active=True
        )
        for ue in ues:
            UEEnrollment.objects.get_or_create(
                peda_enrollment=peda_enrollment,
                ue=ue,
                defaults={'is_optional': False}
            )

        return peda_enrollment

    @staticmethod
    def get_enrollment_stats(academic_year=None):
        """Retourne les statistiques d'inscriptions."""
        from django.db.models import Count

        qs = AdminEnrollment.objects.filter(is_active=True)
        if academic_year:
            qs = qs.filter(academic_year=academic_year)

        return {
            'total': qs.count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'by_type': list(qs.values('type').annotate(count=Count('id'))),
            'validated': qs.filter(status='validee').count(),
            'pending': qs.filter(status='en_attente').count(),
        }
