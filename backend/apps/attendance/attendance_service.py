"""
Service de gestion des présences et absences
"""
from django.utils import timezone
from django.db.models import Count, Q
from .models import AttendanceSheet, AttendanceRecord, AbsenceSummary
from apps.communication.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

ALERT_THRESHOLDS = {'warning': 2, 'critical': 4, 'exclusion_risk': 6}


class AttendanceService:

    @staticmethod
    def update_absence_summary(student, course_space):
        """Recalcule le résumé d'assiduité pour un étudiant/cours"""
        records = AttendanceRecord.objects.filter(
            sheet__session__ec__ue__course_spaces=course_space,
            student=student
        )

        total = records.count()
        present = records.filter(status='present').count()
        absent = records.filter(status='absent').count()
        justified = records.filter(status__in=['absent', 'excuse'], is_justified=True).count()
        late = records.filter(status='retard').count()
        unjustified = absent - justified

        summary, _ = AbsenceSummary.objects.get_or_create(
            student=student, course_space=course_space
        )
        summary.total_sessions = total
        summary.present_count = present
        summary.absent_count = absent
        summary.justified_count = justified
        summary.late_count = late
        summary.unjustified_count = max(0, unjustified)
        summary.attendance_rate = round((present / total * 100), 2) if total > 0 else 0
        summary.punctuality_rate = round(((present - late) / total * 100), 2) if total > 0 else 0

        # Déterminer le niveau d'alerte
        if unjustified >= ALERT_THRESHOLDS['exclusion_risk']:
            summary.alert_level = 'exclusion_risk'
            summary.recommendations = ["Risque d'exclusion — Contacter l'administration immédiatement"]
        elif unjustified >= ALERT_THRESHOLDS['critical']:
            summary.alert_level = 'critical'
            summary.recommendations = ["Alerte critique — Justifier les absences dans les 48h"]
        elif unjustified >= ALERT_THRESHOLDS['warning']:
            summary.alert_level = 'warning'
            summary.recommendations = ["Avertissement — Améliorer l'assiduité"]
        else:
            summary.alert_level = 'none'
            summary.recommendations = []

        summary.save()

        # Envoyer alerte si nouveau niveau critique
        if summary.alert_level != 'none' and not summary.alert_sent:
            AttendanceService.send_absence_alert(student, summary)
            summary.alert_sent = True
            summary.last_alert_sent = timezone.now()
            summary.save(update_fields=['alert_sent', 'last_alert_sent'])

        return summary

    @staticmethod
    def send_absence_alert(student, summary):
        """Envoyer une alerte d'absence à l'étudiant"""
        NotificationService.send_absence_alert(student, summary.unjustified_count)
        logger.info(f"Alerte absence envoyée à {student} — niveau: {summary.alert_level}")

    @staticmethod
    def validate_justification(record, reviewer, approved: bool, comment=''):
        """Valider ou rejeter un justificatif"""
        record.justification_status = 'approved' if approved else 'rejected'
        record.reviewed_by = reviewer
        record.reviewed_at = timezone.now()
        record.reviewer_comment = comment
        if approved:
            record.is_justified = True
            record.status = 'excuse'
        record.save()

        # Notification à l'étudiant
        NotificationService.send_notification(
            recipient_id=record.student.user.id,
            title="Justificatif " + ("accepté" if approved else "rejeté"),
            message=f"Votre justificatif d'absence a été {'accepté' if approved else 'rejeté'}." +
                    (f" Commentaire: {comment}" if comment else ""),
            notif_type='absence',
            priority='normal',
            channel='interne',
            action_url='/my-attendance-student',
            icon='check-circle' if approved else 'x-circle',
            color='green' if approved else 'red'
        )

        # Recalculer le résumé
        if hasattr(record.sheet.session, 'ec'):
            try:
                course_space = record.sheet.session.ec.ue.course_spaces.first()
                if course_space:
                    AttendanceService.update_absence_summary(record.student, course_space)
            except Exception:
                pass

        return record

    @staticmethod
    def bulk_mark_attendance(sheet, student_ids, status='absent'):
        """Marquer plusieurs étudiants en masse"""
        from apps.people.models import Student
        students = Student.objects.filter(id__in=student_ids)
        created = 0
        for student in students:
            _, is_new = AttendanceRecord.objects.update_or_create(
                sheet=sheet, student=student,
                defaults={'status': status, 'method': 'manuel', 'marked_at': timezone.now()}
            )
            if is_new:
                created += 1
        return created

    @staticmethod
    def get_student_attendance_stats(student, academic_year=None):
        """Statistiques d'assiduité globales d'un étudiant"""
        qs = AbsenceSummary.objects.filter(student=student)
        if academic_year:
            qs = qs.filter(course_space__academic_year=academic_year)

        totals = {'total_sessions': 0, 'present': 0, 'absent': 0, 'justified': 0, 'late': 0}
        for s in qs:
            totals['total_sessions'] += s.total_sessions
            totals['present'] += s.present_count
            totals['absent'] += s.absent_count
            totals['justified'] += s.justified_count
            totals['late'] += s.late_count

        t = totals['total_sessions']
        totals['attendance_rate'] = round(totals['present'] / t * 100, 2) if t else 0
        return totals
