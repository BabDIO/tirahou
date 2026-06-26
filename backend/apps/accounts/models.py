from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from apps.core.models import BaseModel


class Role(BaseModel):
    SUPER_ADMIN = 'super_admin'
    ADMIN_INSTITUTIONNEL = 'admin_institutionnel'
    ADMIN_SCOLARITE = 'admin_scolarite'
    ADMIN_FINANCIER = 'admin_financier'
    RESPONSABLE_PEDAGOGIQUE = 'responsable_pedagogique'
    CHEF_DEPARTEMENT = 'chef_departement'
    ENSEIGNANT = 'enseignant'
    TUTEUR = 'tuteur'
    ETUDIANT = 'etudiant'
    DOCTORANT = 'doctorant'
    BIBLIOTHECAIRE = 'bibliothecaire'
    INVITE = 'invite'
    SUPPORT_TECHNIQUE = 'support_technique'

    ROLE_CHOICES = [
        (SUPER_ADMIN, 'Super Administrateur'),
        (ADMIN_INSTITUTIONNEL, 'Administrateur Institutionnel'),
        (ADMIN_SCOLARITE, 'Administrateur Scolarité'),
        (ADMIN_FINANCIER, 'Administrateur Financier'),
        (RESPONSABLE_PEDAGOGIQUE, 'Responsable Pédagogique'),
        (CHEF_DEPARTEMENT, 'Chef de Département'),
        (ENSEIGNANT, 'Enseignant'),
        (TUTEUR, 'Tuteur / Encadreur'),
        (ETUDIANT, 'Étudiant'),
        (DOCTORANT, 'Doctorant'),
        (BIBLIOTHECAIRE, 'Bibliothécaire'),
        (INVITE, 'Invité / Intervenant Externe'),
        (SUPPORT_TECHNIQUE, 'Support Technique'),
    ]

    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rôle'

    def __str__(self):
        return self.get_name_display()


class Permission(BaseModel):
    MODULE_CHOICES = [
        ('academic', 'Académique'),
        ('programs', 'Programmes'),
        ('people', 'Personnes'),
        ('admissions', 'Admissions'),
        ('enrollment', 'Inscriptions'),
        ('finance', 'Finance'),
        ('documents', 'Documents'),
        ('evaluation', 'Évaluation'),
        ('lms', 'LMS'),
        ('virtual_class', 'Classes Virtuelles'),
        ('attendance', 'Présences'),
        ('scheduling', 'Planning'),
        ('internships', 'Stages'),
        ('communication', 'Communication'),
        ('analytics', 'Analytics'),
    ]

    ACTION_CHOICES = [
        ('view', 'Voir'),
        ('create', 'Créer'),
        ('edit', 'Modifier'),
        ('delete', 'Supprimer'),
        ('validate', 'Valider'),
        ('export', 'Exporter'),
    ]

    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'permissions'
        unique_together = ('module', 'action')

    def __str__(self):
        return f"{self.module}:{self.action}"


class RolePermission(BaseModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = 'role_permissions'
        unique_together = ('role', 'permission')


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email obligatoire')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    roles = models.ManyToManyField(Role, blank=True, related_name='users')
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    is_locked = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def has_role(self, role_name):
        return self.roles.filter(name=role_name).exists()

    def has_permission(self, module, action):
        if self.is_superuser:
            return True
        return RolePermission.objects.filter(
            role__in=self.roles.all(),
            permission__module=module,
            permission__action=action,
        ).exists()


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('view', 'Consultation'),
        ('export', 'Export'),
        ('validate', 'Validation'),
        ('login_failed', 'Échec connexion'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    extra_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        verbose_name = 'Journal d\'audit'

    def __str__(self):
        return f"[{self.timestamp}] {self.user} — {self.action} on {self.object_type}"
