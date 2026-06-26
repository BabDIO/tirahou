from django.contrib import admin
from .models import VirtualClassSession, SessionParticipant


class SessionParticipantInline(admin.TabularInline):
    model = SessionParticipant
    extra = 0
    fields = ('user', 'role', 'join_mode', 'joined_at', 'left_at', 'duration_minutes', 'is_present')
    readonly_fields = ('joined_at', 'left_at')


@admin.register(VirtualClassSession)
class VirtualClassSessionAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'course_space', 'provider', 'mode',
        'scheduled_start', 'scheduled_end', 'status', 'is_recorded', 'replay_available',
    )
    list_filter = ('status', 'provider', 'mode', 'is_recorded', 'replay_available')
    search_fields = ('title', 'course_space__title', 'meeting_id')
    readonly_fields = ('created_at', 'updated_at', 'actual_start', 'actual_end')
    ordering = ('-scheduled_start',)
    date_hierarchy = 'scheduled_start'
    inlines = [SessionParticipantInline]

    fieldsets = (
        ('Informations générales', {
            'fields': ('title', 'description', 'course_space', 'created_by')
        }),
        ('Configuration', {
            'fields': ('provider', 'mode', 'room_capacity', 'physical_room')
        }),
        ('Planification', {
            'fields': ('scheduled_start', 'scheduled_end', 'actual_start', 'actual_end', 'status')
        }),
        ('Accès & Enregistrement', {
            'fields': ('meeting_id', 'join_url', 'moderator_password', 'attendee_password',
                       'is_recorded', 'replay_available', 'recording_url')
        }),
        ('Dates système', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(SessionParticipant)
class SessionParticipantAdmin(admin.ModelAdmin):
    list_display = ('session', 'user', 'role', 'join_mode', 'joined_at', 'duration_minutes', 'is_present')
    list_filter = ('role', 'join_mode', 'is_present')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'session__title')
    readonly_fields = ('joined_at', 'left_at', 'created_at')
