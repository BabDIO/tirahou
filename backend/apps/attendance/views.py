from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import AttendanceSheet, AttendanceRecord, AbsenceSummary
from .serializers import AttendanceSheetSerializer, AttendanceRecordSerializer, AbsenceSummarySerializer
from .attendance_service import AttendanceService


class AttendanceSheetViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSheet.objects.all().select_related('session')
    serializer_class = AttendanceSheetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_open']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AttendanceSheet.objects.none()
        user = self.request.user
        qs = AttendanceSheet.objects.select_related('session__ec__ue', 'session__teacher')
        # Enseignant : seulement ses séances
        if hasattr(user, 'teacher_profile'):
            return qs.filter(session__teacher=user)
        # Étudiant : pas accès direct aux feuilles
        if hasattr(user, 'student_profile'):
            return AttendanceSheet.objects.none()
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        import io
        import qrcode
        from django.core.files.base import ContentFile

        sheet = self.get_object()
        sheet.is_open = True
        sheet.opened_at = timezone.now()
        sheet.save()

        if not sheet.qr_code:
            qr_img = qrcode.make(sheet.session_code)
            buf = io.BytesIO()
            qr_img.save(buf, format='PNG')
            sheet.qr_code.save(f'qr_{sheet.session_code}.png', ContentFile(buf.getvalue()), save=True)

        return Response(AttendanceSheetSerializer(sheet).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        sheet = self.get_object()
        sheet.is_open = False
        sheet.closed_at = timezone.now()
        sheet.save()
        # Marquer absents tous les étudiants non enregistrés
        try:
            from apps.people.models import Student
            from apps.enrollment.models import PedaEnrollment
            ec = sheet.session.ec
            enrolled_students = Student.objects.filter(
                admin_enrollments__peda_enrollments__semester=ec.ue.semester,
                admin_enrollments__status='validee'
            ).distinct()
            for student in enrolled_students:
                AttendanceRecord.objects.get_or_create(
                    sheet=sheet, student=student,
                    defaults={'status': 'absent', 'method': 'manuel'}
                )
        except Exception:
            pass
        return Response({'detail': 'Feuille fermée.'})

    @action(detail=True, methods=['post'])
    def mark_by_code(self, request, pk=None):
        sheet = self.get_object()
        if not sheet.is_open:
            return Response({'detail': 'Feuille fermée.'}, status=status.HTTP_400_BAD_REQUEST)
        code = request.data.get('code')
        if code != sheet.session_code:
            return Response({'detail': 'Code invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'detail': 'Profil étudiant requis.'}, status=status.HTTP_400_BAD_REQUEST)
        record, _ = AttendanceRecord.objects.get_or_create(sheet=sheet, student=student)
        record.status = 'present'
        record.method = 'code_seance'
        record.marked_at = timezone.now()
        record.save()
        return Response({'detail': 'Présence enregistrée.'})

    @action(detail=True, methods=['post'])
    def bulk_mark(self, request, pk=None):
        """Marquer plusieurs étudiants en masse"""
        sheet = self.get_object()
        student_ids = request.data.get('student_ids', [])
        mark_status = request.data.get('status', 'absent')
        if mark_status not in ['present', 'absent', 'retard', 'excuse']:
            return Response({'detail': 'Statut invalide.'}, status=400)
        count = AttendanceService.bulk_mark_attendance(sheet, student_ids, mark_status)
        return Response({'detail': f'{count} présences enregistrées.'})

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Résumé des présences pour cette feuille"""
        sheet = self.get_object()
        records = AttendanceRecord.objects.filter(sheet=sheet)
        return Response({
            'total': records.count(),
            'present': records.filter(status='present').count(),
            'absent': records.filter(status='absent').count(),
            'retard': records.filter(status='retard').count(),
            'excuse': records.filter(status='excuse').count(),
        })


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().select_related('student', 'sheet')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['sheet', 'student', 'status', 'justification_status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AttendanceRecord.objects.none()
        user = self.request.user
        qs = AttendanceRecord.objects.select_related('student__user', 'sheet__session')
        # Enseignant : seulement ses séances
        if hasattr(user, 'teacher_profile'):
            return qs.filter(sheet__session__teacher=user)
        # Étudiant : seulement ses propres présences
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    @action(detail=True, methods=['post'])
    def justify(self, request, pk=None):
        """Soumettre un justificatif d'absence"""
        record = self.get_object()
        if record.status not in ['absent', 'retard']:
            return Response({'detail': 'Seules les absences peuvent être justifiées.'}, status=400)
        record.justification = request.data.get('justification', '')
        record.justification_reason = request.data.get('reason', '')
        record.justification_status = 'pending'
        if 'justification_file' in request.FILES:
            record.justification_file = request.FILES['justification_file']
        record.save()
        return Response({'detail': 'Justificatif soumis. En attente de validation.'})

    @action(detail=True, methods=['post'])
    def approve_justification(self, request, pk=None):
        """Valider un justificatif (enseignant/admin)"""
        record = self.get_object()
        comment = request.data.get('comment', '')
        AttendanceService.validate_justification(record, request.user, approved=True, comment=comment)
        return Response({'detail': 'Justificatif approuvé.'})

    @action(detail=True, methods=['post'])
    def reject_justification(self, request, pk=None):
        """Rejeter un justificatif (enseignant/admin)"""
        record = self.get_object()
        comment = request.data.get('comment', '')
        AttendanceService.validate_justification(record, request.user, approved=False, comment=comment)
        return Response({'detail': 'Justificatif rejeté.'})

    @action(detail=False, methods=['get'])
    def pending_justifications(self, request):
        """Liste des justificatifs en attente de validation"""
        records = self.get_queryset().filter(justification_status='pending').select_related(
            'student__user', 'sheet__session'
        )
        return Response(AttendanceRecordSerializer(records, many=True).data)

    @action(detail=False, methods=['get'])
    def my_attendance(self, request):
        """Mes présences (étudiant)"""
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'error': 'Profil étudiant requis.'}, status=400)
        records = self.get_queryset().filter(student=student).order_by('-sheet__opened_at')
        return Response(AttendanceRecordSerializer(records, many=True).data)


class AbsenceSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AbsenceSummary.objects.all().select_related('student', 'course_space')
    serializer_class = AbsenceSummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'course_space', 'alert_level']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AbsenceSummary.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        # Étudiant voit seulement les siennes
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    @action(detail=False, methods=['get'])
    def at_risk(self, request):
        """Étudiants à risque d'exclusion"""
        at_risk = self.get_queryset().filter(
            alert_level__in=['critical', 'exclusion_risk']
        ).select_related('student__user', 'course_space')
        return Response(AbsenceSummarySerializer(at_risk, many=True).data)

    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """Statistiques d'assiduité de l'étudiant connecté"""
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'error': 'Profil étudiant requis.'}, status=400)
        stats = AttendanceService.get_student_attendance_stats(student)
        return Response(stats)

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Recalculer le résumé d'assiduité"""
        summary = self.get_object()
        updated = AttendanceService.update_absence_summary(
            summary.student, summary.course_space
        )
        return Response(AbsenceSummarySerializer(updated).data)
