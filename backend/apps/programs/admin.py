from django.contrib import admin
from .models import Program, Semester, UE, EC, Group


class SemesterInline(admin.TabularInline):
    model = Semester
    extra = 0
    fields = ('number', 'label', 'total_credits', 'academic_year')


class UEInline(admin.TabularInline):
    model = UE
    extra = 0
    fields = ('code', 'name', 'credits', 'coefficient', 'type', 'eval_mode')


class ECInline(admin.TabularInline):
    model = EC
    extra = 0
    fields = ('code', 'name', 'activity_type', 'volume_hours', 'credits')


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'type', 'mode', 'department', 'status', 'capacity', 'candidature_open', 'is_active')
    list_filter = ('type', 'mode', 'status', 'department__faculty__university', 'is_active')
    search_fields = ('code', 'name')
    inlines = [SemesterInline]
    list_editable = ('status', 'candidature_open')
    ordering = ('code',)


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('program', 'number', 'label', 'total_credits', 'academic_year')
    list_filter = ('program', 'academic_year')
    search_fields = ('label', 'program__code')
    inlines = [UEInline]


@admin.register(UE)
class UEAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'semester', 'credits', 'coefficient', 'type', 'eval_mode', 'is_active')
    list_filter = ('type', 'eval_mode', 'semester__program', 'is_active')
    search_fields = ('code', 'name')
    inlines = [ECInline]


@admin.register(EC)
class ECAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'ue', 'activity_type', 'volume_hours', 'credits', 'is_active')
    list_filter = ('activity_type', 'ue__semester__program', 'is_active')
    search_fields = ('code', 'name')
    filter_horizontal = ('teachers',)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'program', 'academic_year', 'type', 'capacity', 'is_active')
    list_filter = ('type', 'program', 'academic_year', 'is_active')
    search_fields = ('name',)
