from django.contrib import admin
from .models import Notification, Announcement, Message, Forum, ForumPost


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'recipient', 'type', 'channel', 'title',
        'is_read', 'is_sent', 'sent_at', 'created_at',
    )
    list_filter = ('type', 'channel', 'is_read', 'is_sent')
    search_fields = ('recipient__email', 'recipient__first_name', 'title', 'message')
    readonly_fields = ('created_at', 'updated_at', 'read_at', 'sent_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Destinataire', {'fields': ('recipient', 'type', 'channel')}),
        ('Contenu', {'fields': ('title', 'message', 'action_url')}),
        ('État', {'fields': ('is_read', 'read_at', 'is_sent', 'sent_at')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'author', 'audience', 'course_space',
        'is_published', 'is_pinned', 'published_at', 'expires_at',
    )
    list_filter = ('audience', 'is_published', 'is_pinned')
    search_fields = ('title', 'content', 'author__email')
    readonly_fields = ('created_at', 'updated_at', 'published_at')
    ordering = ('-is_pinned', '-published_at')

    fieldsets = (
        ('Contenu', {'fields': ('title', 'content', 'attachment')}),
        ('Diffusion', {'fields': ('author', 'audience', 'course_space')}),
        ('Publication', {'fields': ('is_published', 'published_at', 'expires_at', 'is_pinned')}),
        ('Dates système', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'subject', 'is_read', 'read_at', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('sender__email', 'recipient__email', 'subject', 'body')
    readonly_fields = ('created_at', 'updated_at', 'read_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'


class ForumPostInline(admin.TabularInline):
    model = ForumPost
    extra = 0
    fields = ('author', 'content', 'is_pinned', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True


@admin.register(Forum)
class ForumAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_space', 'is_open', 'is_active', 'get_posts_count')
    list_filter = ('is_open', 'is_active')
    search_fields = ('title', 'course_space__title')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ForumPostInline]

    def get_posts_count(self, obj):
        return obj.posts.count()
    get_posts_count.short_description = 'Nb posts'


@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ('forum', 'author', 'get_content_preview', 'is_pinned', 'parent', 'created_at')
    list_filter = ('is_pinned', 'forum')
    search_fields = ('content', 'author__email', 'author__first_name', 'forum__title')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    def get_content_preview(self, obj):
        return obj.content[:80] + '...' if len(obj.content) > 80 else obj.content
    get_content_preview.short_description = 'Contenu'
