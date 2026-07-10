from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from .models import Program, Semester, UE, EC, Group
from .serializers import (
    ProgramSerializer, ProgramDetailSerializer, SemesterSerializer,
    UESerializer, ECSerializer, GroupSerializer,
)


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.filter(is_active=True).select_related('department', 'responsible')
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'mode', 'status', 'department']
    search_fields = ['code', 'name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProgramDetailSerializer
        return ProgramSerializer

    @action(detail=True, methods=['get'])
    def maquette(self, request, pk=None):
        program = self.get_object()
        semesters = program.semesters.prefetch_related('ues__ecs')
        return Response(SemesterSerializer(semesters, many=True).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplique un programme et sa maquette complète (semestres, UE, EC)
        sous un nouveau code — typiquement pour reconduire une offre de
        formation d'une année académique à l'autre.
        """
        source = self.get_object()
        new_code = request.data.get('code')
        if not new_code:
            return Response({'detail': 'Un code est requis pour le nouveau programme.'}, status=400)
        if Program.objects.filter(code=new_code).exists():
            return Response({'detail': 'Ce code de programme existe déjà.'}, status=400)

        clone = Program.objects.get(pk=source.pk)
        clone.pk = None
        clone.code = new_code
        clone.status = 'preparation'
        clone.save()

        for semester in source.semesters.prefetch_related('ues__ecs'):
            sem_clone = Semester.objects.get(pk=semester.pk)
            sem_clone.pk = None
            sem_clone.program = clone
            sem_clone.save()
            for ue in semester.ues.all():
                ue_clone = UE.objects.get(pk=ue.pk)
                ue_clone.pk = None
                ue_clone.semester = sem_clone
                ue_clone.save()
                for ec in ue.ecs.all():
                    ec_clone = EC.objects.get(pk=ec.pk)
                    ec_clone.pk = None
                    ec_clone.ue = ue_clone
                    ec_clone.save()

        return Response(ProgramSerializer(clone).data, status=201)


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all().select_related('program').order_by('id')
    serializer_class = SemesterSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['program', 'academic_year']


class UEViewSet(viewsets.ModelViewSet):
    queryset = UE.objects.filter(is_active=True).select_related('semester')
    serializer_class = UESerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['semester', 'type']
    search_fields = ['code', 'name']


class ECViewSet(viewsets.ModelViewSet):
    queryset = EC.objects.filter(is_active=True).select_related('ue')
    serializer_class = ECSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['ue', 'activity_type']
    search_fields = ['code', 'name']


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.filter(is_active=True)
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['program', 'academic_year', 'type']


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def responsable_dashboard(request):
    """
    Tableau de bord du responsable pédagogique — toutes les valeurs sont
    calculées depuis la base (aucune donnée inventée, y compris pour les
    « actions en attente » qui reflètent de vraies files d'attente).
    """
    from django.db.models import Count, Avg
    from django.utils import timezone
    from apps.people.models import Student, Teacher
    from apps.evaluation.models import Grade, SemesterResult, GradeContest
    from apps.admissions.models import Application

    programs_qs = Program.objects.filter(is_active=True)
    active_programs = programs_qs.filter(status='active')
    type_labels = dict(Program.TYPE_CHOICES)
    by_type = [
        {'type': type_labels.get(row['type'], row['type']), 'count': row['count']}
        for row in active_programs.values('type').annotate(count=Count('id')).order_by('-count')
    ]

    students_total = Student.objects.filter(is_active=True).count()
    teachers_total = Teacher.objects.filter(is_active=True).count()

    avg_grade = Grade.objects.filter(status__in=['validee', 'publiee'], final_grade__isnull=False).aggregate(a=Avg('final_grade'))['a']
    published_results = SemesterResult.objects.filter(published=True)
    success_rate = round((published_results.filter(decision='admis').count() / published_results.count()) * 100, 1) if published_results.exists() else 0

    pending_grades = Grade.objects.filter(status='saisie').count()
    pending_validation = SemesterResult.objects.filter(published=False).count()
    this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    validated_this_month = SemesterResult.objects.filter(published=True, published_at__gte=this_month_start).count()
    contests_total = GradeContest.objects.count()
    contests_rejected = GradeContest.objects.filter(status='rejetee').count()
    rejection_rate = round((contests_rejected / contests_total) * 100, 1) if contests_total else 0

    abandoned_excluded = Student.objects.filter(is_active=True, status__in=['abandonne', 'exclu']).count()
    retention_rate = round(((students_total - abandoned_excluded) / students_total) * 100, 1) if students_total else 0

    dropout_risk = None
    try:
        from apps.analytics_app.models import EngagementScore
        risk_qs = EngagementScore.objects.filter(dropout_risk__in=['eleve', 'critique'])
        total_scored = EngagementScore.objects.count()
        dropout_risk = round((risk_qs.count() / total_scored) * 100, 1) if total_scored else None
    except Exception:
        pass

    pending_actions = []
    for sr in SemesterResult.objects.filter(published=False).select_related('semester').values('semester__label').annotate(count=Count('id')).order_by('-count')[:3]:
        pending_actions.append({
            'action': f"Validation des résultats — {sr['semester__label']}",
            'program': sr['semester__label'], 'deadline': 'À traiter', 'priority': 'haute',
        })
    pending_apps = Application.objects.filter(status='soumise').count()
    if pending_apps:
        pending_actions.append({
            'action': f"{pending_apps} candidature(s) à instruire", 'program': 'Admissions',
            'deadline': 'En attente', 'priority': 'moyenne',
        })
    if contests_total and GradeContest.objects.filter(status='soumise').exists():
        pending_actions.append({
            'action': f"{GradeContest.objects.filter(status='soumise').count()} réclamation(s) de note",
            'program': 'Évaluation', 'deadline': 'En attente', 'priority': 'normale',
        })

    return Response({
        'programs': {'total': programs_qs.count(), 'active': active_programs.count(), 'by_type': by_type},
        'academic': {
            'students_total': students_total,
            'teachers_total': teachers_total,
            'average_grade': round(float(avg_grade), 1) if avg_grade is not None else None,
            'success_rate': success_rate,
        },
        'validation': {
            'pending_grades': pending_grades,
            'pending_validation': pending_validation,
            'validated_this_month': validated_this_month,
            'rejection_rate': rejection_rate,
        },
        'quality': {
            'retention_rate': retention_rate,
            'dropout_risk': dropout_risk,
        },
        'pending_actions': pending_actions,
    })
