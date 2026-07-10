from rest_framework import viewsets, permissions
from rest_framework.decorators import action
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
