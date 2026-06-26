from django.contrib import admin
from .models import AdminEnrollment, PedaEnrollment, UEEnrollment


class PedaEnrollmentInline(admin.TabularInline):
    model = PedaEnrollment
    extra = 0
    fields = ('semester', 'group', 'status', 'confirmed_at')
    readonly_fields = ('confirmed_at',)


class UEEnrollmentInline(admin.TabularInline):
    model = UEEnrollment
    extra = 0
    fields = ('ue', 'is_optional', 'prerequisite_waived')


@admin.register(AdminEnrollment)
class AdminEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('enrollment_number', 'get_student', 'program', 'academic_year',
                    'type', 'status', 'payment_validated', 'created_at')
    list_filter = ('status', 'type', 'program', 'academic_year', 'payment_validated')
    search_fields = ('enrollment_number', 'student__student_id', 'student__user__last_name')
    readonly_fields = ('enrollment_number', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    inlines = [PedaEnrollmentInline]
    date_hierarchy = 'created_at'
    list_select_related = ('student__user', 'program', 'academic_year')

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(PedaEnrollment)
class PedaEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'semester', 'group', 'status', 'confirmed_at')
    list_filter = ('status', 'semester__program', 'semester')
    search_fields = ('admin_enrollment__student__student_id', 'admin_enrollment__student__user__last_name')
    inlines = [UEEnrollmentInline]

    def get_student(self, obj):
        return obj.admin_enrollment.student.user.get_full_name()
    get_student.short_description = 'Étudiant'


@admin.register(UEEnrollment)
class UEEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'ue', 'is_optional', 'prerequisite_waived')
    list_filter = ('is_optional', 'prerequisite_waived', 'ue__semester__program')
    search_fields = ('peda_enrollment__admin_enrollment__student__student_id',)

    def get_student(self, obj):
        return obj.peda_enrollment.admin_enrollment.student.user.get_full_name()
    get_student.short_description = 'Étudiant'
