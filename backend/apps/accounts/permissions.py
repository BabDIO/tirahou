"""
Application réelle du RBAC fin (module/action) défini par
apps.accounts.models.Permission / RolePermission.

Avant ce module, `User.has_permission()` existait mais n'était jamais
invoqué par les vues — l'accès reposait uniquement sur `IsAuthenticated`
et sur les gardes de routes côté frontend. `HasModulePermission` comble
ce trou pour les vues qui déclarent explicitement un `permission_module`.

Une vue qui ne déclare pas `permission_module` continue de se comporter
exactement comme avant (IsAuthenticated) — l'ajout de cette classe ne
régresse donc aucune vue existante tant qu'elle n'est pas migrée
explicitement.
"""

from rest_framework.permissions import BasePermission

METHOD_ACTION_MAP = {
    'GET': 'view', 'HEAD': 'view', 'OPTIONS': 'view',
    'POST': 'create', 'PUT': 'edit', 'PATCH': 'edit', 'DELETE': 'delete',
}

OBJECT_LEVEL_ACTIONS = {'retrieve', 'update', 'partial_update', 'destroy'}


def _is_bypass(user):
    return user.is_superuser or user.has_role('super_admin')


class HasModulePermission(BasePermission):
    """
    Autorise si :
    - l'utilisateur est superuser, ou possède le rôle 'super_admin' ;
    - la vue ne déclare pas `permission_module` (comportement inchangé) ;
    - ou l'utilisateur a la permission (module, action) correspondante,
      via `Role -> RolePermission -> Permission`.

    Les actions portant sur un objet précis (retrieve/update/destroy, ou
    vue générique détail avec un pk dans l'URL) sont volontairement
    laissées passer ici et vérifiées dans `has_object_permission`, pour
    permettre par exemple à un utilisateur d'agir sur sa propre fiche
    (ex: PATCH /users/<son-id>/ depuis la page Profil) sans permission
    RBAC explicite.

    Les actions `@action` personnalisées non standard (ex: `validate`,
    `publish`, `accept`, `reject`) sont traitées comme l'action
    'validate', sauf si la vue déclare un dict
    `permission_action_map = {'nom_action': 'action_permission'}`.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if _is_bypass(user):
            return True

        module = getattr(view, 'permission_module', None)
        if not module:
            return True

        drf_action = getattr(view, 'action', None)
        lookup_kwarg = getattr(view, 'lookup_url_kwarg', None) or getattr(view, 'lookup_field', 'pk')
        has_object_lookup = lookup_kwarg in getattr(view, 'kwargs', {})

        if drf_action in OBJECT_LEVEL_ACTIONS or (drf_action is None and has_object_lookup):
            return True  # contrôle réel délégué à has_object_permission

        overrides = getattr(view, 'permission_action_map', {})
        if drf_action in overrides:
            action = overrides[drf_action]
        elif drf_action == 'create':
            action = 'create'
        elif drf_action == 'list':
            action = 'view'
        elif drf_action:
            action = 'validate'
        else:
            action = METHOD_ACTION_MAP.get(request.method, 'view')

        return user.has_permission(module, action)

    def has_object_permission(self, request, view, obj):
        user = request.user
        # Un utilisateur peut toujours consulter/modifier sa propre fiche.
        if obj == user:
            return True
        if _is_bypass(user):
            return True

        module = getattr(view, 'permission_module', None)
        if not module:
            return True

        overrides = getattr(view, 'permission_action_map', {})
        drf_action = getattr(view, 'action', None)
        if drf_action in overrides:
            action = overrides[drf_action]
        elif drf_action in ('update', 'partial_update'):
            action = 'edit'
        elif drf_action == 'destroy':
            action = 'delete'
        elif drf_action == 'retrieve':
            action = 'view'
        else:
            action = METHOD_ACTION_MAP.get(request.method, 'view')

        return user.has_permission(module, action)
