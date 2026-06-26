from django.contrib import admin
from .models import Internship, Thesis, ThesisProgress, Defense


class ThesisProgressInline(admin.TabularInline):
    model = ThesisProgress
    extra = 0
    fields = ('date', 'note', 'file', 'logged_by')
    readonly_fields = ('logged_by',)


@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'company_name', 'subject',
        'start_date', 'end_date', 'status', 'grade', 'academic_year',
    )
    list_filter = ('status', 'academic_year')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'company_name', 'subject',
    )
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-start_date',)
    date_hierarchy = 'start_date'

    fieldsets = (
        ('Étudiant', {'fields': ('student', 'academic_year', 'supervisor')}),
        ('Entreprise', {'fields': ('company_name', 'company_address', 'company_supervisor', 'company_supervisor_email')}),
        ('Stage', {'fields': ('subject', 'description', 'start_date', 'end_date', 'status')}),
        ('Documents & Évaluation', {'fields': ('convention_file', 'report_file', 'grade')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(Thesis)
class ThesisAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'type', 'title', 'supervisor',
        'status', 'plagiarism_score', 'is_published', 'academic_year',
    )
    list_filter = ('type', 'status', 'is_published', 'academic_year')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'title', 'keywords',
    )
    readonly_fields = ('created_at', 'updated_at', 'validated_at')
    inlines = [ThesisProgressInline]

    fieldsets = (
        ('Étudiant & Encadrement', {'fields': ('student', 'academic_year', 'type', 'supervisor', 'co_supervisor')}),
        ('Sujet', {'fields': ('title', 'abstract', 'keywords')}),
        ('État', {'fields': ('status', 'validated_by', 'validated_at')}),
        ('Dépôt final', {'fields': ('final_file', 'plagiarism_score', 'is_published')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(ThesisProgress)
class ThesisProgressAdmin(admin.ModelAdmin):
    list_display = ('thesis', 'date', 'logged_by', 'created_at')
    list_filter = ('thesis__type', 'thesis__academic_year')
    search_fields = ('thesis__title', 'thesis__student__user__last_name')
    readonly_fields = ('created_at',)
    ordering = ('-date',)


@admin.register(Defense)
class DefenseAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'get_thesis_title', 'scheduled_date',
        'room', 'status', 'grade', 'mention',
    )
    list_filter = ('status',)
    search_fields = (
        'thesis__student__student_id', 'thesis__student__user__last_name',
        'thesis__title',
    )
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('jury_members',)
    ordering = ('scheduled_date',)

    fieldsets = (
        ('Mémoire', {'fields': ('thesis',)}),
        ('Planification', {'fields': ('scheduled_date', 'room', 'virtual_link', 'status')}),
        ('Jury', {'fields': ('jury_president', 'jury_members')}),
        ('Résultat', {'fields': ('grade', 'mention', 'pv_file', 'notes')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return obj.thesis.student.user.get_full_name()
    get_student.short_description = 'Étudiant'

    def get_thesis_title(self, obj):
        return obj.thesis.title[:60]
    get_thesis_title.short_description = 'Titre mémoire'
