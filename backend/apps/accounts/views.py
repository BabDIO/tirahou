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


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.filter(is_active=True).prefetch_related('roles')
    permission_classes = [permissions.IsAuthenticated]

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


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return UserUpdateSerializer if self.request.method in ['PUT', 'PATCH'] else UserSerializer

    def perform_update(self, serializer):
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
    permission_classes = [permissions.IsAuthenticated]


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['action', 'module', 'user']
    search_fields = ['description', 'object_type']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        return AuditLog.objects.select_related('user').all()


@extend_schema(request={'application/json': {'type': 'object', 'properties': {'role_ids': {'type': 'array', 'items': {'type': 'string'}}}}}, responses={200: OpenApiResponse(description='Rôles assignés')})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def assign_roles(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        role_ids = request.data.get('role_ids', [])
        user.roles.set(Role.objects.filter(id__in=role_ids))
        log_action(request.user, 'update', 'accounts', 'User', user_id, f"Rôles mis à jour", request)
        return Response({'detail': 'Rôles assignés avec succès.'})
    except User.DoesNotExist:
        return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
