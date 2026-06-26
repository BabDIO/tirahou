from rest_framework import viewsets, permissions
from .models import University, Faculty, Department, AcademicYear, LMDRegulation
from .serializers import (
    UniversitySerializer, FacultySerializer, DepartmentSerializer,
    AcademicYearSerializer, LMDRegulationSerializer,
)


class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.filter(is_active=True)
    serializer_class = UniversitySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'acronym']


class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.filter(is_active=True).select_related('university')
    serializer_class = FacultySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['university']
    search_fields = ['name', 'acronym']


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True).select_related('faculty')
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['faculty']
    search_fields = ['name', 'acronym']


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all().order_by('-start_date', 'id')
    serializer_class = AcademicYearSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_current']


class LMDRegulationViewSet(viewsets.ModelViewSet):
    queryset = LMDRegulation.objects.filter(is_active=True)
    serializer_class = LMDRegulationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['cycle', 'university']
