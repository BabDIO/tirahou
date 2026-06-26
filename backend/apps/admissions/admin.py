from django.contrib import admin
from .models import Application, ApplicationDocument, AdmissionDecision


class ApplicationDocumentInline(admin.TabularInline):
    model = ApplicationDocument
    extra = 0
    fields = ('doc_type', 'file', 'status', 'rejection_reason')
    readonly_fields = ('verified_by', 'verified_at')


class AdmissionDecisionInline(admin.StackedInline):
    model = AdmissionDecision
    extra = 0
    readonly_fields = ('decided_at',)


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_number', 'get_applicant', 'program', 'academic_year',
                    'status', 'score', 'rank', 'submitted_at', 'application_fee_paid')
    list_filter = ('status', 'program', 'academic_year', 'application_fee_paid')
    search_fields = ('application_number', 'applicant__first_name', 'applicant__last_name', 'applicant__email')
    readonly_fields = ('application_number', 'submitted_at', 'created_at', 'updated_at')
    ordering = ('-submitted_at',)
    inlines = [ApplicationDocumentInline, AdmissionDecisionInline]
    date_hierarchy = 'created_at'

    def get_applicant(self, obj):
        return obj.applicant.get_full_name()
    get_applicant.short_description = 'Candidat'


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = ('application', 'doc_type', 'status', 'verified_by', 'verified_at')
    list_filter = ('doc_type', 'status')
    search_fields = ('application__application_number',)


@admin.register(AdmissionDecision)
class AdmissionDecisionAdmin(admin.ModelAdmin):
    list_display = ('application', 'decision', 'decided_by', 'decided_at', 'accepted_by_student')
    list_filter = ('decision', 'accepted_by_student')
    readonly_fields = ('decided_at',)
