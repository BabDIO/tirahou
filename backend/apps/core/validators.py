"""
Services de validation métier centralisés — TIRAHOU
Règles LMD, inscriptions, paiements, notes
"""
from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_enrollment(student, program, academic_year):
    """
    Valide qu'un étudiant peut s'inscrire à un programme.
    Règles : pas de double inscription, programme actif, année ouverte.
    """
    from apps.enrollment.models import AdminEnrollment

    # Vérifier double inscription
    existing = AdminEnrollment.objects.filter(
        student=student,
        program=program,
        academic_year=academic_year,
        status__in=['en_attente', 'validee'],
    ).exists()
    if existing:
        raise ValidationError(
            f"L'étudiant {student.student_id} est déjà inscrit à {program.code} pour {academic_year.label}."
        )

    # Vérifier que le programme est actif
    if program.status != 'active':
        raise ValidationError(f"Le programme {program.code} n'est pas actif (statut: {program.status}).")

    # Vérifier la capacité
    current_count = AdminEnrollment.objects.filter(
        program=program, academic_year=academic_year, status='validee'
    ).count()
    if current_count >= program.capacity:
        raise ValidationError(
            f"Le programme {program.code} a atteint sa capacité maximale ({program.capacity} étudiants)."
        )

    # Vérifier la période d'inscription
    now = timezone.now().date()
    if academic_year.admin_enrollment_start and now < academic_year.admin_enrollment_start:
        raise ValidationError(
            f"La période d'inscription n'a pas encore commencé (début: {academic_year.admin_enrollment_start})."
        )
    if academic_year.admin_enrollment_end and now > academic_year.admin_enrollment_end:
        raise ValidationError(
            f"La période d'inscription est terminée (fin: {academic_year.admin_enrollment_end})."
        )


def validate_payment(invoice, amount, method):
    """Valide un paiement avant enregistrement."""
    from decimal import Decimal

    if amount <= 0:
        raise ValidationError("Le montant du paiement doit être positif.")

    remaining = invoice.total_amount - invoice.paid_amount - invoice.discount_amount
    if Decimal(str(amount)) > remaining:
        raise ValidationError(
            f"Le montant ({amount}) dépasse le reste à payer ({remaining})."
        )

    if invoice.status == 'annulee':
        raise ValidationError("Impossible de payer une facture annulée.")

    valid_methods = ['mobile_money', 'carte_bancaire', 'virement', 'caisse', 'cheque']
    if method not in valid_methods:
        raise ValidationError(f"Mode de paiement invalide. Valeurs acceptées: {valid_methods}")


def validate_grade(student, ec, exam_session, cc_grade=None, exam_grade=None, final_grade=None):
    """Valide une note avant saisie."""
    from decimal import Decimal

    # Vérifier que la session est ouverte
    if not exam_session.is_open:
        raise ValidationError(f"La session d'examen {exam_session} est fermée.")

    # Vérifier les plages de notes
    for name, value in [('CC', cc_grade), ('Examen', exam_grade), ('Finale', final_grade)]:
        if value is not None:
            v = Decimal(str(value))
            if v < 0 or v > 20:
                raise ValidationError(f"La note {name} ({value}) doit être entre 0 et 20.")

    # Vérifier que l'étudiant est inscrit à l'UE
    from apps.enrollment.models import UEEnrollment
    enrolled = UEEnrollment.objects.filter(
        peda_enrollment__admin_enrollment__student=student,
        ue=ec.ue,
    ).exists()
    if not enrolled:
        raise ValidationError(
            f"L'étudiant {student.student_id} n'est pas inscrit à l'UE {ec.ue.code}."
        )


def validate_application(applicant, program, academic_year):
    """Valide une candidature avant soumission."""
    from apps.admissions.models import Application

    # Vérifier double candidature
    existing = Application.objects.filter(
        applicant=applicant,
        program=program,
        academic_year=academic_year,
        status__in=['brouillon', 'soumise', 'en_instruction', 'admis'],
    ).exists()
    if existing:
        raise ValidationError(
            f"Une candidature existe déjà pour {program.code} — {academic_year.label}."
        )

    # Vérifier que le programme accepte des candidatures
    if not program.candidature_open:
        raise ValidationError(f"Le programme {program.code} n'accepte pas de candidatures actuellement.")

    # Vérifier la période de candidature
    now = timezone.now().date()
    if academic_year.candidature_start and now < academic_year.candidature_start:
        raise ValidationError("La période de candidature n'a pas encore commencé.")
    if academic_year.candidature_end and now > academic_year.candidature_end:
        raise ValidationError("La période de candidature est terminée.")


def check_prerequisites(student, ue):
    """
    Vérifie les prérequis LMD pour s'inscrire à une UE.
    Retourne (ok: bool, message: str)
    """
    # Pour l'instant, pas de prérequis définis — extensible
    return True, ""


def compute_student_status_after_deliberation(student, academic_year, regulation):
    """
    Calcule le nouveau statut académique d'un étudiant après délibération.
    Retourne: 'admis', 'redoublant', 'exclu', 'epuisement'
    """
    from apps.evaluation.models import SemesterResult
    from apps.enrollment.models import AdminEnrollment

    try:
        enrollment = AdminEnrollment.objects.get(
            student=student, academic_year=academic_year, status='validee'
        )
    except AdminEnrollment.DoesNotExist:
        return None

    # Compter les années passées dans ce programme
    years_in_program = AdminEnrollment.objects.filter(
        student=student, program=enrollment.program, status='validee'
    ).count()

    if years_in_program > regulation.max_years_allowed:
        return 'epuisement'

    # Vérifier les résultats du semestre
    results = SemesterResult.objects.filter(
        student=student,
        semester__program=enrollment.program,
        published=True,
    ).order_by('-created_at')

    if not results.exists():
        return None

    latest = results.first()
    if latest.decision == 'admis':
        return 'admis'
    elif latest.decision == 'redoublant':
        if years_in_program >= regulation.max_years_allowed:
            return 'exclu'
        return 'redoublant'

    return 'ajourné'
