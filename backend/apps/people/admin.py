from django.contrib import admin
from .models import Student, Teacher, AdminStaff


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'get_full_name', 'get_email', 'gender', 'nationality',
                    'current_program', 'current_level', 'status', 'is_active')
    list_filter = ('status', 'gender', 'current_program', 'current_year', 'is_active')
    search_fields = ('student_id', 'user__first_name', 'user__last_name', 'user__email', 'national_id')
    readonly_fields = ('student_id', 'created_at', 'updated_at')
    ordering = ('student_id',)
    list_select_related = ('user', 'current_program')

    fieldsets = (
        ('Identité', {'fields': ('user', 'student_id', 'national_id', 'gender', 'birth_date', 'birth_place', 'nationality', 'photo')}),
        ('Parcours académique', {'fields': ('current_program', 'current_year', 'current_level', 'status')}),
        ('Baccalauréat', {'fields': ('baccalaureate_year', 'baccalaureate_series', 'baccalaureate_mention')}),
        ('Contact urgence', {'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation')}),
        ('Adresse', {'fields': ('address',)}),
        ('Dates', {'fields': ('created_at', 'updated_at')}),
    )

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Nom complet'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('teacher_id', 'get_full_name', 'get_email', 'grade', 'status', 'department', 'is_active')
    list_filter = ('grade', 'status', 'department', 'is_active')
    search_fields = ('teacher_id', 'user__first_name', 'user__last_name', 'user__email')
    readonly_fields = ('teacher_id', 'created_at', 'updated_at')
    list_select_related = ('user', 'department')

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Nom complet'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'


@admin.register(AdminStaff)
class AdminStaffAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'get_full_name', 'service', 'position', 'department', 'is_active')
    list_filter = ('service', 'is_active')
    search_fields = ('staff_id', 'user__first_name', 'user__last_name')
    list_select_related = ('user',)

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Nom complet'
