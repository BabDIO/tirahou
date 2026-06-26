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
