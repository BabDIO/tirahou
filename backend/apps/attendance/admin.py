from django.contrib import admin
from .models import AttendanceSheet, AttendanceRecord, AbsenceSummary


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    fields = ('student', 'status', 'method', 'marked_at', 'is_justified')
    readonly_fields = ('marked_at',)


@admin.register(AttendanceSheet)
class AttendanceSheetAdmin(admin.ModelAdmin):
    list_display = ('session', 'session_code', 'is_open', 'opened_at', 'closed_at', 'created_by')
    list_filter = ('is_open',)
    search_fields = ('session_code', 'session__ec__code')
    readonly_fields = ('session_code', 'opened_at', 'closed_at', 'created_at', 'updated_at')
    inlines = [AttendanceRecordInline]

    fieldsets = (
        ('Séance', {'fields': ('session', 'session_code', 'created_by')}),
        ('État', {'fields': ('is_open', 'opened_at', 'closed_at')}),
        ('QR Code', {'fields': ('qr_code',)}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'sheet', 'status', 'method', 'marked_at', 'is_justified')
    list_filter = ('status', 'method', 'is_justified')
    search_fields = ('student__student_id', 'student__user__first_name', 'student__user__last_name')
    readonly_fields = ('marked_at', 'created_at', 'updated_at')
    ordering = ('-marked_at',)

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(AbsenceSummary)
class AbsenceSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'course_space', 'total_sessions',
        'present_count', 'absent_count', 'justified_count',
        'attendance_rate', 'alert_sent',
    )
    list_filter = ('alert_sent', 'course_space__ue__semester__program')
    search_fields = ('student__student_id', 'student__user__first_name', 'student__user__last_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('attendance_rate',)

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'
