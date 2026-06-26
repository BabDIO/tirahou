from django.contrib import admin
from .models import DocumentCategory, StudentDocument, GeneratedDocument, DocumentAccessLog


class DocumentAccessLogInline(admin.TabularInline):
    model = DocumentAccessLog
    extra = 0
    fields = ('accessed_by', 'ip_address', 'verification_method', 'accessed_at')
    readonly_fields = ('accessed_at',)
    can_delete = False
    max_num = 10


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'requires_validation', 'is_active')
    list_filter = ('requires_validation', 'is_active')
    search_fields = ('name', 'code', 'description')
    ordering = ('name',)

    fieldsets = (
        ('Identification', {'fields': ('name', 'code', 'description')}),
        ('Configuration', {'fields': ('requires_validation', 'is_active')}),
    )


@admin.register(StudentDocument)
class StudentDocumentAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'category', 'title', 'status',
        'version', 'get_file_size', 'uploaded_by', 'created_at',
    )
    list_filter = ('status', 'category', 'version')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'title',
    )
    readonly_fields = ('created_at', 'updated_at', 'verified_at', 'file_size', 'mime_type')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Étudiant', {'fields': ('student', 'category')}),
        ('Document', {'fields': ('title', 'file', 'file_size', 'mime_type', 'version')}),
        ('Validation', {'fields': ('status', 'verified_by', 'verified_at', 'rejection_reason')}),
        ('Métadonnées', {'fields': ('uploaded_by', 'expiry_date')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'

    def get_file_size(self, obj):
        if obj.file_size:
            if obj.file_size < 1024:
                return f"{obj.file_size} B"
            elif obj.file_size < 1024 * 1024:
                return f"{obj.file_size / 1024:.1f} KB"
            return f"{obj.file_size / (1024*1024):.1f} MB"
        return '—'
    get_file_size.short_description = 'Taille'


@admin.register(GeneratedDocument)
class GeneratedDocumentAdmin(admin.ModelAdmin):
    list_display = (
        'get_student', 'doc_type', 'title', 'verification_code',
        'status', 'generated_by', 'delivered_at', 'created_at',
    )
    list_filter = ('doc_type', 'status')
    search_fields = (
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'verification_code', 'title',
    )
    readonly_fields = ('verification_code', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    inlines = [DocumentAccessLogInline]

    fieldsets = (
        ('Étudiant', {'fields': ('student', 'doc_type', 'title')}),
        ('Fichier & Vérification', {'fields': ('file', 'verification_code', 'qr_code')}),
        ('État', {'fields': ('status', 'generated_by', 'delivered_at', 'valid_until')}),
        ('Métadonnées', {'fields': ('metadata',), 'classes': ('collapse',)}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(DocumentAccessLog)
class DocumentAccessLogAdmin(admin.ModelAdmin):
    list_display = ('document', 'accessed_by', 'ip_address', 'verification_method', 'accessed_at')
    list_filter = ('verification_method',)
    search_fields = ('document__verification_code', 'accessed_by__email', 'ip_address')
    readonly_fields = ('accessed_at',)
    ordering = ('-accessed_at',)
    date_hierarchy = 'accessed_at'
