from rest_framework import permissions


class IsInstructorOrStaff(permissions.BasePermission):
    """Autorise si l'utilisateur est staff, superuser ou membre d'un groupe enseignant."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True
        # groups names may vary; common ones: 'teachers', 'instructors'
        return user.groups.filter(name__in=['teachers', 'instructors', 'staff']).exists()
