from rest_framework import serializers
from .models import University, Faculty, Department, AcademicYear, LMDRegulation


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = '__all__'


class FacultySerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = Faculty
        fields = '__all__'
        # university en lecture seule : l'app est pensée pour un
        # établissement unique (voir docs/NOTE_CONCEPTION_MULTI_TENANT.md),
        # le formulaire de création ne le demande donc pas — sans ce
        # read_only, le champ obligatoire bloquait toute création avec
        # "Ce champ est obligatoire." (voir FacultyViewSet.perform_create).
        read_only_fields = ['university']


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)

    class Meta:
        model = Department
        fields = '__all__'


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class LMDRegulationSerializer(serializers.ModelSerializer):
    cycle_display = serializers.CharField(source='get_cycle_display', read_only=True)

    class Meta:
        model = LMDRegulation
        fields = '__all__'
