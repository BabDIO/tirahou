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
