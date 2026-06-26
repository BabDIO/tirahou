from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'get_roles', 'is_active', 'is_staff', 'created_at')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'roles')
    search_fields = ('email', 'first_name', 'last_name', 'username')
    ordering = ('-created_at',)
    filter_horizontal = ('roles', 'groups', 'user_permissions')
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'last_login_ip')
    fieldsets = (
        ('Identifiants', {'fields': ('email', 'username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'phone', 'avatar')}),
        ('Rôles & Permissions', {'fields': ('roles', 'is_active', 'is_staff', 'is_superuser', 'is_verified', 'is_locked', 'groups', 'user_permissions')}),
        ('Sécurité', {'fields': ('last_login', 'last_login_ip', 'failed_login_attempts')}),
        ('Dates', {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'username', 'first_name', 'last_name', 'password1', 'password2')}),
    )

    def get_roles(self, obj):
        return ', '.join([r.get_name_display() for r in obj.roles.all()]) or '—'
    get_roles.short_description = 'Rôles'


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('get_name_display', 'description', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('module', 'action', 'description')
    list_filter = ('module', 'action')


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ('role', 'permission')
    list_filter = ('role',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'module', 'object_type', 'ip_address')
    list_filter = ('action', 'module')
    search_fields = ('user__email', 'description', 'object_type')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'
