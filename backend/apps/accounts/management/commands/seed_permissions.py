"""
Initialise le référentiel RBAC (Permission + RolePermission) pour que
apps.accounts.permissions.HasModulePermission ait des données réelles à
vérifier, en cohérence avec les rôles déjà utilisés par les gardes de
routes du frontend (voir frontend/src/App.tsx et useRole.ts).

Idempotent : peut être relancé sans dupliquer les enregistrements.

Usage :
    python manage.py seed_permissions
"""

from django.core.management.base import BaseCommand
from apps.accounts.models import Role, Permission, RolePermission


# Toutes les permissions (module, action) déclarées comme référentiel —
# seules celles listées dans ROLE_GRANTS sont effectivement accordées ;
# le reste existe pour documenter les combinaisons possibles et pour que
# les futures vues migrées vers HasModulePermission trouvent déjà leurs
# Permission en base.
ALL_MODULES = [m for m, _ in Permission.MODULE_CHOICES]
ALL_ACTIONS = [a for a, _ in Permission.ACTION_CHOICES]

# Accès accordés par rôle, pour les modules actuellement contrôlés par
# HasModulePermission (accounts, finance, evaluation). super_admin et
# admin_institutionnel ne sont pas listés : ils bypassent toujours via
# User.is_superuser / has_role('super_admin').
ROLE_GRANTS = {
    'admin_financier': {
        'finance': ['view', 'create', 'edit', 'delete', 'validate', 'export'],
    },
    'admin_scolarite': {
        'evaluation': ['view', 'create', 'edit', 'validate', 'export'],
    },
    'responsable_pedagogique': {
        'evaluation': ['view', 'validate'],
    },
    'chef_departement': {
        'evaluation': ['view', 'validate'],
    },
    'enseignant': {
        'evaluation': ['view', 'create', 'edit'],
    },
    'tuteur': {
        'evaluation': ['view', 'create', 'edit'],
    },
}


class Command(BaseCommand):
    help = "Initialise les Permission et RolePermission du RBAC fin (module/action)."

    def handle(self, *args, **options):
        created_perms = 0
        for module in ALL_MODULES:
            for action in ALL_ACTIONS:
                _, created = Permission.objects.get_or_create(module=module, action=action)
                created_perms += int(created)
        self.stdout.write(self.style.SUCCESS(
            f"Permissions référencées : {len(ALL_MODULES) * len(ALL_ACTIONS)} ({created_perms} créées)."
        ))

        granted = 0
        skipped_roles = []
        for role_name, modules in ROLE_GRANTS.items():
            role = Role.objects.filter(name=role_name).first()
            if not role:
                skipped_roles.append(role_name)
                continue
            for module, actions in modules.items():
                for action in actions:
                    perm = Permission.objects.get(module=module, action=action)
                    _, created = RolePermission.objects.get_or_create(role=role, permission=perm)
                    granted += int(created)

        self.stdout.write(self.style.SUCCESS(f"Permissions accordées aux rôles : {granted} nouvelles associations."))
        if skipped_roles:
            self.stdout.write(self.style.WARNING(
                f"Rôles absents en base (ignorés, exécutez create_test_users.py d'abord si besoin) : {', '.join(skipped_roles)}"
            ))
