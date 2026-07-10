from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from .models import User, Role, Permission, RolePermission, AuditLog


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_active']


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'module', 'action', 'description']


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone', 'avatar', 'roles', 'full_name', 'is_active',
            'is_verified', 'is_locked', 'mfa_enabled', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_verified', 'mfa_enabled']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phone', 'password', 'role_ids']
        read_only_fields = ['id']

    def create(self, validated_data):
        role_ids = validated_data.pop('role_ids', [])
        user = User.objects.create_user(**validated_data)
        if role_ids:
            user.roles.set(Role.objects.filter(id__in=role_ids))
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'avatar',
            # Champs de gestion admin (Super Admin / Admin institutionnel)
            'is_locked',
            'is_active',
            'is_verified',
        ]

    def update(self, instance, validated_data):
        # Déverrouiller un compte réinitialise aussi le compteur d'échecs,
        # sinon un seul nouvel échec le reverrouillerait immédiatement.
        if validated_data.get('is_locked') is False and instance.is_locked:
            instance.failed_login_attempts = 0
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value


MAX_FAILED_LOGIN_ATTEMPTS = 5


class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    # Utiliser 'email' au lieu de 'username' pour la connexion
    username_field = 'email'
    mfa_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        # Remplacer username par email pour authenticate()
        email = attrs.get('email')
        password = attrs.get('password')
        mfa_code = (attrs.get('mfa_code') or '').strip()

        existing_user = User.objects.filter(email=email).first()

        if existing_user and existing_user.is_locked:
            raise serializers.ValidationError({
                'account_locked': True,
                'detail': "Compte verrouillé après plusieurs tentatives de connexion échouées. "
                          "Contactez un administrateur pour le débloquer.",
            })

        user = authenticate(
            request=self.context.get('request'),
            email=email,
            password=password
        )

        if not user:
            if existing_user:
                existing_user.failed_login_attempts += 1
                if existing_user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                    existing_user.is_locked = True
                existing_user.save(update_fields=['failed_login_attempts', 'is_locked'])
            raise serializers.ValidationError(
                "Aucun compte actif n'a été trouvé avec les identifiants fournis"
            )

        if user.mfa_enabled:
            import pyotp
            if not mfa_code:
                raise serializers.ValidationError({
                    'mfa_required': True,
                    'detail': "Code de double authentification requis.",
                })
            if not pyotp.TOTP(user.mfa_secret).verify(mfa_code, valid_window=1):
                raise serializers.ValidationError({
                    'mfa_required': True,
                    'detail': "Code de double authentification invalide.",
                })

        # Générer les tokens
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
        }
        
        return data
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['full_name'] = user.get_full_name()
        token['roles'] = list(user.roles.values_list('name', flat=True))
        return token


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user_name', 'action', 'module', 'object_type', 'object_id', 'description', 'ip_address', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'Système'
