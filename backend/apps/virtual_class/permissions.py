from rest_framework import permissions

# Rôles considérés "staff" pour démarrer/terminer/annuler une classe
# virtuelle, en plus de l'enseignant assigné à la session.
STAFF_ROLES = ('super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique')


class IsInstructorOrStaff(permissions.BasePermission):
    """Autorise si l'utilisateur est enseignant ou possède un rôle admin/
    pédagogique.

    BUG corrigé : la version précédente vérifiait `user.is_staff`/
    `user.groups` (le système d'permissions Django natif), qui ne sont
    JAMAIS peuplés dans ce projet — tout le RBAC ici repose sur le modèle
    `Role` personnalisé (apps.accounts). Résultat : AUCUN enseignant ne
    pouvait jamais démarrer/terminer/annuler sa propre classe virtuelle
    (confirmé en direct : POST /virtual-sessions/{id}/start/ renvoyait 403
    même pour l'enseignant assigné à la session) — seul un superuser
    Django le pouvait. L'appartenance à la session elle-même reste vérifiée
    en amont par VirtualClassSessionViewSet.get_queryset(), qui ne renvoie
    déjà que les sessions de l'enseignant (ou toutes pour les rôles admin) ;
    cette permission ne fait donc que ré-exclure les étudiants, qui peuvent
    voir ces mêmes sessions en lecture.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if hasattr(user, 'teacher_profile'):
            return True
        return user.roles.filter(name__in=STAFF_ROLES).exists()
