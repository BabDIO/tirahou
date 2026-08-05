from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import User, Role, AuditLog
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, AuditLogSerializer, ChangePasswordSerializer,
    CustomTokenObtainSerializer,
)
from .permissions import HasModulePermission

# Même périmètre que UserListCreateView.get_queryset() ci-dessous (les
# rôles qui gèrent déjà les comptes utilisateurs) : AdminUsersPage.tsx
# (frontend) permet à ces rôles de créer des comptes ET de leur assigner
# des rôles, donc restreindre l'attribution de rôles à un sous-ensemble
# plus étroit casserait ce flux légitime existant.
ROLE_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'responsable_pedagogique', 'chef_departement',
)


class IsRoleManager(permissions.BasePermission):
    """Faille CRITIQUE corrigée : RoleListCreateView/RoleDetailView/
    assign_roles n'avaient auparavant QUE IsAuthenticated — n'importe quel
    utilisateur authentifié (y compris un simple étudiant) pouvait créer/
    modifier/supprimer un Role, ou s'auto-attribuer n'importe quel rôle
    (dont super_admin) via POST /users/<id>/roles/. Cela permettait de
    contourner intégralement tout le RBAC de l'application, y compris
    chaque correctif d'autorisation apporté au cours de cet audit — c'est
    la faille la plus grave trouvée dans tout le projet.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.roles.filter(name__in=ROLE_MANAGER_ROLES).exists()
        ))


def log_action(user, action, module, obj_type='', obj_id='', description='', request=None):
    ip = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    AuditLog.objects.create(
        user=user, action=action, module=module,
        object_type=obj_type, object_id=str(obj_id),
        description=description, ip_address=ip,
    )


from apps.core.throttling import LoginRateThrottle

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            email = request.data.get('email', '')
            try:
                user = User.objects.get(email=email)
                user.failed_login_attempts = 0
                user.last_login_ip = request.META.get('REMOTE_ADDR')
                user.save(update_fields=['failed_login_attempts', 'last_login_ip'])
                log_action(user, 'login', 'accounts', request=request)
            except User.DoesNotExist:
                pass
        return response


class LogoutView(APIView):
    @extend_schema(request={'application/json': {'type': 'object', 'properties': {'refresh': {'type': 'string'}}}}, responses={200: OpenApiResponse(description='Déconnexion réussie')})
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            log_action(request.user, 'logout', 'accounts', request=request)
            return Response({'detail': 'Déconnexion réussie.'})
        except Exception:
            return Response({'detail': 'Token invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class MfaSetupView(APIView):
    """Génère un nouveau secret TOTP + QR code de provisionnement (non actif tant que non vérifié)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import pyotp
        import qrcode
        import io
        import base64

        user = request.user
        secret = pyotp.random_base32()
        user.mfa_secret = secret
        user.mfa_enabled = False
        user.save(update_fields=['mfa_secret', 'mfa_enabled'])

        uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name='TIRAHOU')
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        return Response({'secret': secret, 'qr_code': f'data:image/png;base64,{qr_b64}'})


class MfaVerifySetupView(APIView):
    """Confirme l'activation du MFA après scan du QR code et saisie d'un code valide."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import pyotp

        user = request.user
        code = (request.data.get('code') or '').strip()
        if not user.mfa_secret:
            return Response({'detail': 'Aucune configuration MFA en attente. Relancez la configuration.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1):
            return Response({'detail': 'Code invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        user.mfa_enabled = True
        user.save(update_fields=['mfa_enabled'])
        log_action(user, 'update', 'accounts', description='Double authentification activée', request=request)
        return Response({'detail': 'Double authentification activée avec succès.'})


class MfaDisableView(APIView):
    """Désactive le MFA après confirmation du mot de passe."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get('password') or ''
        if not user.check_password(password):
            return Response({'detail': 'Mot de passe incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.mfa_enabled = False
        user.mfa_secret = ''
        user.save(update_fields=['mfa_enabled', 'mfa_secret'])
        log_action(user, 'update', 'accounts', description='Double authentification désactivée', request=request)
        return Response({'detail': 'Double authentification désactivée.'})


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.filter(is_active=True).prefetch_related('roles')
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'accounts'

    def get_queryset(self):
        user = self.request.user
        # Seuls les admins peuvent lister tous les utilisateurs
        if user.roles.filter(name__in=[
            'super_admin', 'admin_institutionnel', 'admin_scolarite',
            'responsable_pedagogique', 'chef_departement'
        ]).exists() or user.is_staff:
            return User.objects.filter(is_active=True).prefetch_related('roles')
        # Autres rôles : seulement leur propre profil
        return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == 'POST' else UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(self.request.user, 'create', 'accounts', 'User', user.id, f"Création utilisateur {user.email}", self.request)



# UserUpdateSerializer expose is_locked/is_active/is_verified (commentés
# "Champs de gestion admin") sans read_only_fields, et has_object_permission
# de HasModulePermission laisse passer tout PATCH où `obj == user` (pour
# permettre l'auto-édition du profil, ex: page Profil) — combinés, ces deux
# points laissaient n'importe quel utilisateur authentifié déverrouiller
# son propre compte (is_locked=false, remet aussi failed_login_attempts à
# 0 via UserUpdateSerializer.update()) et s'auto-vérifier (is_verified=true)
# via PATCH /accounts/users/<son-id>/ ou /accounts/auth/me/.
ADMIN_ACCOUNT_ROLES = ('super_admin', 'admin_institutionnel')
_PRIVILEGED_ACCOUNT_FIELDS = ('is_locked', 'is_active', 'is_verified')


def _strip_privileged_fields_if_not_admin(request, serializer):
    user = request.user
    is_admin = user.is_superuser or user.roles.filter(name__in=ADMIN_ACCOUNT_ROLES).exists()
    if not is_admin:
        for field in _PRIVILEGED_ACCOUNT_FIELDS:
            serializer.validated_data.pop(field, None)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    permission_module = 'accounts'

    def get_serializer_class(self):
        return UserUpdateSerializer if self.request.method in ['PUT', 'PATCH'] else UserSerializer

    def perform_update(self, serializer):
        _strip_privileged_fields_if_not_admin(self.request, serializer)
        user = serializer.save()
        log_action(self.request.user, 'update', 'accounts', 'User', user.id, request=self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'delete', 'accounts', 'User', instance.id, request=self.request)
        instance.is_active = False
        instance.save()


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return UserUpdateSerializer if self.request.method in ['PUT', 'PATCH'] else UserSerializer

    def perform_update(self, serializer):
        _strip_privileged_fields_if_not_admin(self.request, serializer)
        serializer.save()


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: OpenApiResponse(description='Mot de passe modifié')})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            log_action(request.user, 'update', 'accounts', 'User', request.user.id, 'Changement de mot de passe', request)
            return Response({'detail': 'Mot de passe modifié avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsRoleManager]


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsRoleManager]


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    # Faille corrigée : n'importe quel utilisateur authentifié pouvait
    # consulter le journal d'audit COMPLET du système (actions de tous les
    # utilisateurs, adresses IP...). Confirmé en direct (un compte étudiant
    # a obtenu une réponse 200 avec des résultats, pas un 403).
    permission_classes = [permissions.IsAuthenticated, IsRoleManager]
    filterset_fields = ['action', 'module', 'user']
    search_fields = ['description', 'object_type']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        return AuditLog.objects.select_related('user').all()


# Rôles à plus haut privilège : IsRoleManager autorise déjà 5 rôles à
# appeler assign_roles (nécessaire pour AdminUsersPage.tsx), mais rien
# n'empêchait ensuite un simple chef_departement/responsable_pedagogique
# d'attribuer super_admin (à lui-même ou à quiconque), contournant tout le
# RBAC — élévation de privilèges verticale confirmée par lecture du code.
TOP_LEVEL_ROLES = ('super_admin', 'admin_institutionnel')


@extend_schema(request={'application/json': {'type': 'object', 'properties': {'role_ids': {'type': 'array', 'items': {'type': 'string'}}}}}, responses={200: OpenApiResponse(description='Rôles assignés')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsRoleManager])
def assign_roles(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        role_ids = request.data.get('role_ids', [])
        roles = Role.objects.filter(id__in=role_ids)
        requester = request.user
        is_top_level = requester.is_superuser or requester.roles.filter(name__in=TOP_LEVEL_ROLES).exists()
        if not is_top_level and roles.filter(name__in=TOP_LEVEL_ROLES).exists():
            return Response(
                {'detail': "Seul un administrateur institutionnel peut attribuer ce rôle."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.roles.set(roles)
        log_action(request.user, 'update', 'accounts', 'User', user_id, f"Rôles mis à jour", request)
        return Response({'detail': 'Rôles assignés avec succès.'})
    except User.DoesNotExist:
        return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
