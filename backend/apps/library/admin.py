from django.contrib import admin
from .models import LibraryDocument


@admin.register(LibraryDocument)
class LibraryDocumentAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'author', 'type', 'domain', 'year',
        'access_level', 'download_count', 'view_count',
        'is_featured', 'is_active', 'uploaded_by',
    )
    list_filter = ('type', 'domain', 'access_level', 'is_featured', 'is_active')
    search_fields = ('title', 'author', 'keywords', 'abstract', 'isbn')
    list_editable = ('is_featured', 'is_active')
    readonly_fields = ('download_count', 'view_count', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Identification', {
            'fields': ('title', 'author', 'type', 'domain', 'year', 'isbn')
        }),
        ('Contenu', {
            'fields': ('abstract', 'keywords')
        }),
        ('Fichier & Accès', {
            'fields': ('file', 'cover', 'external_url', 'access_level')
        }),
        ('Statistiques', {
            'fields': ('download_count', 'view_count'),
            'classes': ('collapse',),
        }),
        ('Publication', {
            'fields': ('is_featured', 'is_active', 'uploaded_by')
        }),
        ('Dates système', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
