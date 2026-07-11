from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import ExamSession, Grade, UEResult, SemesterResult, Jury, GradeContest, ExamRoomAssignment
from .serializers import (
    ExamSessionSerializer, GradeSerializer, UEResultSerializer,
    SemesterResultSerializer, JurySerializer, GradeContestSerializer,
    ExamRoomAssignmentSerializer,
)
from apps.accounts.permissions import HasModulePermission


class UEResultViewSet(viewsets.ModelViewSet):
    queryset = UEResult.objects.all().select_related('student', 'ue', 'exam_session')
    serializer_class = UEResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'ue', 'exam_session', 'decision']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return UEResult.objects.none()
        user = self.request.user
        qs = UEResult.objects.select_related('student__user', 'ue__semester__program', 'exam_session')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(
                ue__ecs__teachers=user
            ).distinct()
        return qs


class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.all()
    serializer_class = ExamSessionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'
    filterset_fields = ['semester', 'academic_year', 'session_type', 'is_open']

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        session = self.get_object()
        session.is_open = True
        session.save()
        return Response({'detail': 'Session ouverte.'})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        session = self.get_object()
        session.is_open = False
        session.save()
        return Response({'detail': 'Session fermée.'})


class ExamRoomAssignmentViewSet(viewsets.ModelViewSet):
    """Planification des examens : salle, créneau, surveillants par EC (G7)."""
    queryset = ExamRoomAssignment.objects.all().select_related('ec', 'room', 'exam_session').prefetch_related('invigilators')
    serializer_class = ExamRoomAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'
    filterset_fields = ['exam_session', 'ec', 'room']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ExamRoomAssignment.objects.none()
        user = self.request.user
        qs = ExamRoomAssignment.objects.select_related('ec', 'room', 'exam_session').prefetch_related('invigilators')
        if hasattr(user, 'teacher_profile'):
            return qs.filter(invigilators=user)
        return qs


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all().select_related('student', 'ec', 'exam_session')
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'
    filterset_fields = ['exam_session', 'ec', 'student', 'status']
    search_fields = ['student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Grade.objects.none()
        user = self.request.user
        qs = Grade.objects.select_related('student__user', 'ec__ue', 'exam_session', 'entered_by')

        # Étudiant : seulement ses notes publiées
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile, status='publiee')

        # Enseignant : seulement les notes des EC qu'il enseigne
        if hasattr(user, 'teacher_profile'):
            return qs.filter(ec__teachers=user)

        # Admin, scolarité, responsable : tout
        return qs

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        grade = self.get_object()
        grade.status = 'validee'
        grade.validated_by = request.user
        grade.validated_at = timezone.now()
        grade.save()
        return Response({'detail': 'Note validée.'})

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        grade = self.get_object()
        grade.status = 'publiee'
        grade.save()
        return Response({'detail': 'Note publiée.'})

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        grades_data = request.data.get('grades', [])
        created = 0
        for item in grades_data:
            Grade.objects.update_or_create(
                student_id=item['student_id'],
                ec_id=item['ec_id'],
                exam_session_id=item['exam_session_id'],
                defaults={
                    'cc_grade': item.get('cc_grade'),
                    'exam_grade': item.get('exam_grade'),
                    'final_grade': item.get('final_grade'),
                    'entered_by': request.user,
                }
            )
            created += 1
        return Response({'detail': f'{created} notes importées.'})


class SemesterResultViewSet(viewsets.ModelViewSet):
    queryset = SemesterResult.objects.all().select_related('student', 'semester')
    serializer_class = SemesterResultSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'
    filterset_fields = ['semester', 'exam_session', 'published', 'decision']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return SemesterResult.objects.none()
        user = self.request.user
        qs = SemesterResult.objects.select_related('student__user', 'semester__program', 'exam_session')
        # Étudiant : seulement ses résultats publiés
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile, published=True)
        # Enseignant : résultats publiés de ses étudiants
        if hasattr(user, 'teacher_profile'):
            return qs.filter(
                student__admin_enrollments__peda_enrollments__ue_enrollments__ue__ecs__teachers=user,
                published=True
            ).distinct()
        return qs

    @action(detail=False, methods=['post'])
    def publish_all(self, request):
        session_id = request.data.get('exam_session_id')
        if not session_id:
            return Response({'detail': 'exam_session_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        # Compat front: certains écrans envoient "current"
        if session_id == 'current':
            current = ExamSession.objects.filter(is_open=True).order_by('-created_at').first()
            if not current:
                current = ExamSession.objects.order_by('-created_at').first()
            if not current:
                return Response({'detail': "Aucune session d'examen disponible."}, status=status.HTTP_404_NOT_FOUND)
            session_id = str(current.id)

        updated = SemesterResult.objects.filter(exam_session_id=session_id).update(
            published=True, published_at=timezone.now()
        )
        return Response({'detail': f'Résultats publiés ({updated}).', 'exam_session_id': session_id})

    @extend_schema(
        parameters=[],
        responses={200: OpenApiResponse(description='PV de délibération (PDF)')},
    )
    @action(detail=False, methods=['get'], url_path='pv')
    def pv(self, request):
        """
        Génère un PV de délibération simple (PDF).
        Filtres optionnels via query params: semester, exam_session.
        """
        semester_id = request.query_params.get('semester')
        exam_session_id = request.query_params.get('exam_session')
        if exam_session_id == 'current':
            current = ExamSession.objects.filter(is_open=True).order_by('-created_at').first()
            if not current:
                current = ExamSession.objects.order_by('-created_at').first()
            exam_session_id = str(current.id) if current else None

        qs = self.get_queryset().select_related('student__user', 'semester', 'exam_session')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        if exam_session_id:
            qs = qs.filter(exam_session_id=exam_session_id)

        qs = qs.order_by('student__student_id')[:500]

        # Génération PDF minimale (ReportLab)
        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        width, height = A4

        title = "PROCÈS-VERBAL DE DÉLIBÉRATION"
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 60, title)

        c.setFont("Helvetica", 9)
        meta_y = height - 80
        if semester_id:
            c.drawString(50, meta_y, f"Semestre: {semester_id}")
            meta_y -= 12
        if exam_session_id:
            c.drawString(50, meta_y, f"Session: {exam_session_id}")
            meta_y -= 12
        c.drawString(50, meta_y, f"Généré le: {timezone.now().strftime('%d/%m/%Y %H:%M')}")

        y = meta_y - 30
        c.setFont("Helvetica-Bold", 9)
        c.drawString(50, y, "Matricule")
        c.drawString(140, y, "Nom")
        c.drawString(360, y, "Moyenne")
        c.drawString(430, y, "Crédits")
        c.drawString(500, y, "Décision")
        y -= 12
        c.setLineWidth(0.5)
        c.line(50, y, width - 50, y)
        y -= 12

        c.setFont("Helvetica", 9)
        for r in qs:
            if y < 80:
                c.showPage()
                y = height - 60
                c.setFont("Helvetica-Bold", 9)
                c.drawString(50, y, "Matricule")
                c.drawString(140, y, "Nom")
                c.drawString(360, y, "Moyenne")
                c.drawString(430, y, "Crédits")
                c.drawString(500, y, "Décision")
                y -= 12
                c.line(50, y, width - 50, y)
                y -= 12
                c.setFont("Helvetica", 9)

            student = r.student
            full_name = getattr(student, 'user', None).get_full_name() if getattr(student, 'user', None) else str(student)
            avg = f"{float(r.average):.2f}" if r.average is not None else "—"
            credits = f"{r.credits_obtained}/{r.total_credits}" if r.total_credits is not None else "—"
            decision = (r.decision or "—").upper()

            c.drawString(50, y, str(student.student_id))
            c.drawString(140, y, (full_name or "")[:35])
            c.drawRightString(400, y, avg)
            c.drawRightString(480, y, credits)
            c.drawString(500, y, decision[:12])
            y -= 14

        c.showPage()
        c.save()
        buf.seek(0)

        resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = 'attachment; filename="pv_deliberation.pdf"'
        return resp


class JuryViewSet(viewsets.ModelViewSet):
    queryset = Jury.objects.all()
    serializer_class = JurySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'


class GradeContestViewSet(viewsets.ModelViewSet):
    queryset = GradeContest.objects.all()
    serializer_class = GradeContestSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'evaluation'
    filterset_fields = ['status', 'student']

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        contest = self.get_object()
        new_grade = request.data.get('new_grade')
        contest.status = 'acceptee'
        contest.reviewed_by = request.user
        contest.response = request.data.get('response', '')
        if new_grade:
            contest.new_grade = new_grade
            contest.grade.final_grade = new_grade
            contest.grade.save()
        contest.save()
        return Response({'detail': 'Réclamation acceptée.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        contest = self.get_object()
        contest.status = 'rejetee'
        contest.reviewed_by = request.user
        contest.response = request.data.get('response', '')
        contest.save()
        return Response({'detail': 'Réclamation rejetée.'})


@extend_schema(responses={200: OpenApiResponse(description='Export CSV des notes')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_grades(request):
    """Export des notes en CSV."""
    import csv
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="notes.csv"'
    writer = csv.writer(response)
    writer.writerow(['Etudiant', 'EC', 'CC', 'Examen', 'Note finale', 'Absent', 'Statut'])
    qs = Grade.objects.select_related('student__user', 'ec').all()
    exam_session = request.query_params.get('exam_session')
    if exam_session:
        qs = qs.filter(exam_session_id=exam_session)
    for g in qs:
        writer.writerow([
            g.student.user.get_full_name(),
            g.ec.code,
            g.cc_grade or '',
            g.exam_grade or '',
            g.final_grade or '',
            'Oui' if g.is_absent else 'Non',
            g.get_status_display(),
        ])
    return response


@extend_schema(responses={200: OpenApiResponse(description='Modèle CSV import notes')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def grade_template(request):
    """Télécharger le modèle d'import de notes."""
    import csv
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="template_notes.csv"'
    writer = csv.writer(response)
    writer.writerow(['student_id', 'ec_code', 'exam_session_id', 'cc_grade', 'exam_grade', 'is_absent'])
    writer.writerow(['ETU-001', 'INF301', 'session-uuid', '14.5', '12.0', 'False'])
    return response


# AMÉLIORATIONS: Nouveaux endpoints par acteur

@extend_schema(responses={200: OpenApiResponse(description='Notes d\'un étudiant')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_grades(request):
    """Mes notes (ÉTUDIANT)"""
    from .services import GradeService
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Profil étudiant non trouvé'}, status=404)
    student = request.user.student_profile
    exam_session_id = request.query_params.get('exam_session')
    exam_session = None
    if exam_session_id:
        try:
            exam_session = ExamSession.objects.get(id=exam_session_id)
        except ExamSession.DoesNotExist:
            pass
    grades = GradeService.get_student_grades(student, exam_session)
    return Response(GradeSerializer(grades, many=True).data)


@extend_schema(responses={200: OpenApiResponse(description='Statistiques de notes d\'un étudiant')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_statistics(request):
    """Statistiques globales de notes de l'étudiant connecté (ÉTUDIANT) — crédits obtenus/disponibles cumulés."""
    from django.db.models import Avg
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Profil étudiant non trouvé'}, status=404)
    student = request.user.student_profile
    results = SemesterResult.objects.filter(student=student)
    total_credits = sum(r.credits_obtained for r in results)
    total_credits_available = sum(r.total_credits for r in results)
    avg = Grade.objects.filter(
        student=student, is_absent=False, final_grade__isnull=False
    ).aggregate(avg=Avg('final_grade'))['avg']
    return Response({
        'total_credits': total_credits,
        'total_credits_available': total_credits_available,
        'average': round(float(avg), 2) if avg is not None else None,
        'semesters_validated': results.filter(decision='admis').count(),
    })


@extend_schema(responses={200: OpenApiResponse(description='Relevé de notes complet')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_transcript(request):
    """Relevé de notes complet (ÉTUDIANT)"""
    from .services import ResultService
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Profil étudiant non trouvé'}, status=404)
    student = request.user.student_profile
    academic_year_id = request.query_params.get('academic_year')
    transcript = ResultService.get_student_transcript(student, academic_year_id)
    return Response(transcript)


@extend_schema(responses={200: OpenApiResponse(description='Soumettre une réclamation')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_grade_contest(request):
    """Soumettre une réclamation (ÉTUDIANT)"""
    from apps.people.models import Student
    from .services import GradeService
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Profil étudiant non trouvé'}, status=404)
    grade_id = request.data.get('grade_id')
    reason = request.data.get('reason')
    if not all([grade_id, reason]):
        return Response({'error': 'grade_id et reason requis'}, status=400)
    contest, message = GradeService.submit_grade_contest(grade_id, student, reason)
    if contest:
        return Response(GradeContestSerializer(contest).data, status=201)
    return Response({'error': message}, status=400)


@extend_schema(responses={200: OpenApiResponse(description='Notes saisies par l\'enseignant')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def teacher_grades(request):
    """Notes saisies par l'enseignant"""
    from .services import GradeService
    if not hasattr(request.user, 'teacher_profile'):
        return Response({'error': 'Profil enseignant non trouvé'}, status=404)
    teacher = request.user.teacher_profile
    ec_id = request.query_params.get('ec')
    exam_session_id = request.query_params.get('exam_session')
    grades = GradeService.get_teacher_grades(teacher, ec_id, exam_session_id)
    return Response(GradeSerializer(grades, many=True).data)


@extend_schema(responses={200: OpenApiResponse(description='Statistiques de classe')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def class_statistics(request):
    """Statistiques d'une classe (ENSEIGNANT)"""
    from .services import GradeService
    from apps.programs.models import EC
    ec_id = request.query_params.get('ec')
    exam_session_id = request.query_params.get('exam_session')
    if not all([ec_id, exam_session_id]):
        return Response({'error': 'ec et exam_session requis'}, status=400)
    try:
        ec = EC.objects.get(id=ec_id)
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except (EC.DoesNotExist, ExamSession.DoesNotExist):
        return Response({'error': 'EC ou session non trouvé'}, status=404)
    stats = GradeService.calculate_class_statistics(ec, exam_session)
    if stats:
        return Response(stats)
    return Response({'error': 'Aucune donnée disponible'}, status=404)


@extend_schema(responses={200: OpenApiResponse(description='Saisir une note')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enter_grade(request):
    """Saisir une note (ENSEIGNANT)"""
    from apps.people.models import Student
    from apps.programs.models import EC
    from .services import GradeService
    student_id = request.data.get('student_id')
    ec_id = request.data.get('ec_id')
    exam_session_id = request.data.get('exam_session_id')
    cc_grade = request.data.get('cc_grade')
    exam_grade = request.data.get('exam_grade')
    is_absent = request.data.get('is_absent', False)
    appreciation = request.data.get('appreciation', '')
    if not all([student_id, ec_id, exam_session_id]):
        return Response({'error': 'student_id, ec_id et exam_session_id requis'}, status=400)
    try:
        student = Student.objects.get(id=student_id)
        ec = EC.objects.get(id=ec_id)
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except (Student.DoesNotExist, EC.DoesNotExist, ExamSession.DoesNotExist):
        return Response({'error': 'Données non trouvées'}, status=404)
    grade = GradeService.enter_grade(
        student=student, ec=ec, exam_session=exam_session,
        cc_grade=cc_grade, exam_grade=exam_grade,
        entered_by=request.user, is_absent=is_absent, appreciation=appreciation
    )
    return Response(GradeSerializer(grade).data, status=201)


@extend_schema(responses={200: OpenApiResponse(description='Valider des notes en masse')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_grades_bulk(request):
    """Valider des notes en masse (RESPONSABLE PÉDA)"""
    from .services import GradeService
    grade_ids = request.data.get('grade_ids', [])
    if not grade_ids:
        return Response({'error': 'grade_ids requis'}, status=400)
    count = GradeService.validate_grades_bulk(grade_ids, request.user)
    return Response({'detail': f'{count} notes validées'})


@extend_schema(responses={200: OpenApiResponse(description='Calculer les résultats d\'UE')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_ue_results(request):
    """Calculer les résultats d'UE (RESPONSABLE PÉDA)"""
    from .services import ResultService
    exam_session_id = request.data.get('exam_session_id')
    if not exam_session_id:
        return Response({'error': 'exam_session_id requis'}, status=400)
    try:
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session non trouvée'}, status=404)
    count = ResultService.calculate_ue_results(exam_session)
    return Response({'detail': f'{count} résultats d\'UE calculés'})


@extend_schema(responses={200: OpenApiResponse(description='Calculer les résultats semestriels')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_semester_results(request):
    """Calculer les résultats semestriels (RESPONSABLE PÉDA)"""
    from .services import ResultService
    exam_session_id = request.data.get('exam_session_id')
    if not exam_session_id:
        return Response({'error': 'exam_session_id requis'}, status=400)
    try:
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session non trouvée'}, status=404)
    count = ResultService.calculate_semester_results(exam_session)
    return Response({'detail': f'{count} résultats semestriels calculés'})


@extend_schema(responses={200: OpenApiResponse(description='Publier les résultats semestriels')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def publish_semester_results(request):
    """Publier les résultats (ADMIN SCOLARITÉ)"""
    from .services import ResultService
    exam_session_id = request.data.get('exam_session_id')
    if not exam_session_id:
        return Response({'error': 'exam_session_id requis'}, status=400)
    try:
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session non trouvée'}, status=404)
    count = ResultService.publish_semester_results(exam_session)
    return Response({'detail': f'{count} résultats publiés'})


@extend_schema(responses={200: OpenApiResponse(description='Distribution statistique des notes d\'un EC')})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def grade_distribution(request):
    """Statistiques avancées (quartiles, écart-type, distribution) des notes d'un EC pour une session d'examen."""
    from .analytics import GradeAnalytics
    from apps.programs.models import EC

    ec_id = request.query_params.get('ec')
    exam_session_id = request.query_params.get('exam_session')
    if not ec_id or not exam_session_id:
        return Response({'error': 'Paramètres ec et exam_session requis'}, status=400)
    try:
        ec = EC.objects.get(id=ec_id)
        exam_session = ExamSession.objects.get(id=exam_session_id)
    except (EC.DoesNotExist, ExamSession.DoesNotExist):
        return Response({'error': 'EC ou session introuvable'}, status=404)

    stats = GradeAnalytics.get_distribution(ec, exam_session)
    if stats is None:
        return Response({'detail': 'Aucune note disponible pour cette combinaison EC/session.'}, status=404)
    return Response(stats)
