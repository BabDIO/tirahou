from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import University, Faculty, Department, AcademicYear, LMDRegulation
from .serializers import (
    UniversitySerializer, FacultySerializer, DepartmentSerializer,
    AcademicYearSerializer, LMDRegulationSerializer,
)

# Rôles habilités à administrer la structure académique de référence
# (établissement, facultés, départements, années académiques, régime LMD).
# Ces ViewSets n'avaient QUE IsAuthenticated : n'importe quel étudiant
# pouvait créer/modifier/supprimer ces objets. Confirmé en direct sur la
# prod : un compte étudiant a créé une AcademicYear avec is_current=True,
# ce qui — via AcademicYear.save() qui désactive is_current sur toutes les
# autres années — a réellement désactivé l'année académique en cours du
# système entier (enrollments, sessions d'examen, etc. s'appuient dessus).
ACADEMIC_STRUCTURE_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique',
)


class IsAcademicStructureManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.roles.filter(name__in=ACADEMIC_STRUCTURE_ROLES).exists()
        ))


class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.filter(is_active=True)
    serializer_class = UniversitySerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicStructureManager]
    search_fields = ['name', 'acronym']


class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.filter(is_active=True).select_related('university')
    serializer_class = FacultySerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicStructureManager]
    filterset_fields = ['university']
    search_fields = ['name', 'acronym']

    def perform_create(self, serializer):
        # university est en lecture seule côté serializer (voir
        # FacultySerializer) : toujours assignée ici plutôt que fournie par
        # le client. Même pattern que apps.finance.views._get_university_name()
        # et les vues PDF pour récupérer "l'" établissement de cette app
        # mono-établissement.
        university = University.objects.filter(is_active=True).first()
        if university is None:
            raise ValidationError(
                "Aucun établissement (University) n'existe encore — "
                "il faut en créer un avant de pouvoir ajouter une faculté."
            )
        serializer.save(university=university)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True).select_related('faculty')
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicStructureManager]
    filterset_fields = ['faculty']
    search_fields = ['name', 'acronym']


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all().order_by('-start_date', 'id')
    serializer_class = AcademicYearSerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicStructureManager]
    filterset_fields = ['is_current']


class LMDRegulationViewSet(viewsets.ModelViewSet):
    queryset = LMDRegulation.objects.filter(is_active=True)
    serializer_class = LMDRegulationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicStructureManager]
    filterset_fields = ['cycle', 'university']
