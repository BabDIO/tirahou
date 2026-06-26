from django.contrib import admin
from .models import Room, ScheduledSession, Timetable


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = (
        'code', 'name', 'type', 'capacity', 'building', 'floor',
        'has_projector', 'has_computer', 'has_internet', 'is_virtual', 'is_active',
    )
    list_filter = ('type', 'building', 'has_projector', 'has_internet', 'is_virtual', 'is_active')
    search_fields = ('code', 'name', 'building')
    list_editable = ('is_active',)
    ordering = ('code',)

    fieldsets = (
        ('Identification', {'fields': ('code', 'name', 'type')}),
        ('Localisation', {'fields': ('building', 'floor', 'capacity')}),
        ('Équipements', {'fields': ('has_projector', 'has_computer', 'has_internet', 'is_virtual')}),
        ('État', {'fields': ('is_active',)}),
    )


@admin.register(ScheduledSession)
class ScheduledSessionAdmin(admin.ModelAdmin):
    list_display = (
        'ec', 'teacher', 'room', 'group', 'mode',
        'start_datetime', 'end_datetime', 'status', 'academic_year',
    )
    list_filter = ('mode', 'status', 'academic_year', 'ec__ue__semester__program')
    search_fields = ('ec__code', 'ec__name', 'teacher__first_name', 'teacher__last_name', 'room__code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('start_datetime',)
    date_hierarchy = 'start_datetime'

    fieldsets = (
        ('Cours', {'fields': ('ec', 'group', 'academic_year')}),
        ('Ressources', {'fields': ('teacher', 'room', 'mode')}),
        ('Horaires', {'fields': ('start_datetime', 'end_datetime')}),
        ('État', {'fields': ('status', 'cancellation_reason', 'rescheduled_to')}),
        ('Récurrence', {'fields': ('is_recurring', 'recurrence_rule'), 'classes': ('collapse',)}),
        ('Notes', {'fields': ('notes',)}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ('group', 'academic_year', 'week_number', 'is_published', 'published_at')
    list_filter = ('is_published', 'academic_year', 'group__program')
    search_fields = ('group__name', 'group__program__code')
    filter_horizontal = ('sessions',)
    readonly_fields = ('published_at', 'created_at', 'updated_at')
