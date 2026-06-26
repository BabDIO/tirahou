from django.contrib import admin
from .models import University, Faculty, Department, AcademicYear, LMDRegulation


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym', 'email', 'website', 'is_active')
    search_fields = ('name', 'acronym')


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym', 'university', 'dean', 'is_active')
    list_filter = ('university', 'is_active')
    search_fields = ('name', 'acronym')
    autocomplete_fields = ('university',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym', 'faculty', 'head', 'is_active')
    list_filter = ('faculty__university', 'faculty', 'is_active')
    search_fields = ('name', 'acronym')


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('label', 'start_date', 'end_date', 'is_current', 'is_active')
    list_filter = ('is_current', 'is_active')
    search_fields = ('label',)
    ordering = ('-start_date',)


@admin.register(LMDRegulation)
class LMDRegulationAdmin(admin.ModelAdmin):
    list_display = ('name', 'cycle', 'university', 'passing_grade', 'max_years_allowed', 'is_active')
    list_filter = ('cycle', 'university', 'is_active')
    search_fields = ('name',)
