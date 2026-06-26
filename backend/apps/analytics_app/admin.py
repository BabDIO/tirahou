from django.contrib import admin
from .models import LearningActivity, EngagementScore, DashboardStat


@admin.register(LearningActivity)
class LearningActivityAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'course_space', 'action',
        'duration_seconds', 'device_type', 'ip_address', 'timestamp',
    )
    list_filter = ('action', 'device_type', 'course_space__ue__semester__program')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'course_space__title',
    )
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'

    fieldsets = (
        ('Étudiant & Cours', {'fields': ('student', 'course_space', 'resource')}),
        ('Activité', {'fields': ('action', 'duration_seconds', 'device_type', 'ip_address')}),
        ('Horodatage', {'fields': ('timestamp',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(EngagementScore)
class EngagementScoreAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'course_space', 'academic_year',
        'engagement_score', 'completion_rate', 'dropout_risk',
        'connection_count', 'total_time_minutes', 'alert_sent', 'last_computed',
    )
    list_filter = ('dropout_risk', 'alert_sent', 'academic_year', 'course_space__ue__semester__program')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name',
    )
    readonly_fields = ('last_computed', 'created_at', 'updated_at')
    ordering = ('dropout_risk', '-engagement_score')

    fieldsets = (
        ('Étudiant & Cours', {'fields': ('student', 'course_space', 'academic_year')}),
        ('Indicateurs d\'engagement', {
            'fields': (
                'connection_count', 'total_time_minutes', 'resources_viewed',
                'assignments_submitted', 'quizzes_attempted', 'forum_posts',
                'virtual_class_attended', 'completion_rate',
            )
        }),
        ('Score & Risque', {'fields': ('engagement_score', 'dropout_risk', 'alert_sent')}),
        ('Dates système', {'fields': ('last_computed', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(DashboardStat)
class DashboardStatAdmin(admin.ModelAdmin):
    list_display = ('stat_type', 'label', 'value', 'academic_year', 'computed_at')
    list_filter = ('stat_type', 'academic_year')
    search_fields = ('label',)
    readonly_fields = ('computed_at', 'created_at', 'updated_at')
    ordering = ('stat_type', 'label')

    fieldsets = (
        ('Statistique', {'fields': ('stat_type', 'label', 'value', 'academic_year')}),
        ('Données supplémentaires', {'fields': ('extra_data',), 'classes': ('collapse',)}),
        ('Dates système', {'fields': ('computed_at', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
