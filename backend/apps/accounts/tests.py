from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.accounts.models import User, Role, Permission, RolePermission
from apps.accounts.permissions import HasModulePermission


class UserRoleTests(TestCase):
    """User.has_role() / has_permission() — la brique de base du RBAC."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='rbac.test@tirahou.edu', username='rbac_test',
            first_name='RBAC', last_name='Test', password='Test@2024',
        )
        self.role = Role.objects.create(name='enseignant')
        self.user.roles.add(self.role)

    def test_has_role_true_for_assigned_role(self):
        self.assertTrue(self.user.has_role('enseignant'))

    def test_has_role_false_for_unassigned_role(self):
        self.assertFalse(self.user.has_role('admin_scolarite'))

    def test_has_permission_false_without_role_permission(self):
        self.assertFalse(self.user.has_permission('evaluation', 'edit'))

    def test_has_permission_true_once_granted_to_role(self):
        permission = Permission.objects.create(module='evaluation', action='edit')
        RolePermission.objects.create(role=self.role, permission=permission)
        self.assertTrue(self.user.has_permission('evaluation', 'edit'))

    def test_superuser_always_has_permission(self):
        superuser = User.objects.create_superuser(
            email='super.test@tirahou.edu', username='super_test',
            first_name='Super', last_name='Test', password='Test@2024',
        )
        # Aucune Permission/RolePermission en base -- bypass uniquement via is_superuser.
        self.assertTrue(superuser.has_permission('evaluation', 'delete'))


class _FakeView:
    """Simule les attributs qu'un ViewSet DRF réel expose à HasModulePermission,
    sans avoir à monter une vue complète derrière une URL."""
    def __init__(self, permission_module=None, action=None, kwargs=None, permission_action_map=None):
        self.permission_module = permission_module
        self.action = action
        self.kwargs = kwargs or {}
        if permission_action_map is not None:
            self.permission_action_map = permission_action_map


class HasModulePermissionTests(TestCase):
    """
    HasModulePermission : la vue qui ne déclare pas `permission_module` doit
    se comporter EXACTEMENT comme IsAuthenticated (pas de régression sur les
    17 apps qui n'ont pas encore migré vers le RBAC fin) ; celles qui le
    déclarent doivent réellement vérifier Role -> RolePermission -> Permission.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = HasModulePermission()
        self.user = User.objects.create_user(
            email='hmp.test@tirahou.edu', username='hmp_test',
            first_name='HMP', last_name='Test', password='Test@2024',
        )
        self.role = Role.objects.create(name='enseignant')
        self.user.roles.add(self.role)

    def _request(self, method='GET'):
        req = getattr(self.factory, method.lower())('/fake/')
        req.user = self.user
        return req

    def test_no_permission_module_declared_behaves_like_is_authenticated(self):
        view = _FakeView(permission_module=None, action='list')
        self.assertTrue(self.permission.has_permission(self._request(), view))

    def test_unauthenticated_user_denied(self):
        from django.contrib.auth.models import AnonymousUser
        req = self.factory.get('/fake/')
        req.user = AnonymousUser()
        view = _FakeView(permission_module='evaluation', action='list')
        self.assertFalse(self.permission.has_permission(req, view))

    def test_list_denied_without_view_permission(self):
        view = _FakeView(permission_module='evaluation', action='list')
        self.assertFalse(self.permission.has_permission(self._request(), view))

    def test_list_allowed_with_view_permission_granted(self):
        permission = Permission.objects.create(module='evaluation', action='view')
        RolePermission.objects.create(role=self.role, permission=permission)
        view = _FakeView(permission_module='evaluation', action='list')
        self.assertTrue(self.permission.has_permission(self._request(), view))

    def test_create_requires_create_permission_specifically(self):
        # 'view' accordé, mais PAS 'create' -> une action create doit rester refusée.
        permission = Permission.objects.create(module='evaluation', action='view')
        RolePermission.objects.create(role=self.role, permission=permission)
        view = _FakeView(permission_module='evaluation', action='create')
        self.assertFalse(self.permission.has_permission(self._request('POST'), view))

    def test_object_level_action_deferred_to_has_object_permission(self):
        # retrieve/update/destroy passent toujours has_permission() (True) :
        # le vrai contrôle se fait dans has_object_permission() avec l'objet réel.
        view = _FakeView(permission_module='evaluation', action='retrieve', kwargs={'pk': '123'})
        self.assertTrue(self.permission.has_permission(self._request(), view))

    def test_object_permission_denied_without_edit_permission(self):
        view = _FakeView(permission_module='evaluation', action='update')
        other_user = User.objects.create_user(
            email='other.test@tirahou.edu', username='other_test',
            first_name='Other', last_name='Test', password='Test@2024',
        )
        self.assertFalse(self.permission.has_object_permission(self._request('PATCH'), view, other_user))

    def test_user_can_always_edit_own_object(self):
        # Cas d'usage réel : PATCH /users/<son-id>/ depuis la page Profil,
        # sans permission RBAC explicite sur le module accounts.
        view = _FakeView(permission_module='accounts', action='update')
        self.assertTrue(self.permission.has_object_permission(self._request('PATCH'), view, self.user))

    def test_superuser_bypasses_object_permission(self):
        superuser = User.objects.create_superuser(
            email='super2.test@tirahou.edu', username='super2_test',
            first_name='Super', last_name='Two', password='Test@2024',
        )
        view = _FakeView(permission_module='evaluation', action='destroy')
        other_user = User.objects.create_user(
            email='third.test@tirahou.edu', username='third_test',
            first_name='Third', last_name='Test', password='Test@2024',
        )
        req = self._request('DELETE')
        req.user = superuser
        self.assertTrue(self.permission.has_object_permission(req, view, other_user))
