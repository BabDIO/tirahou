from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import AdminEnrollment, PedaEnrollment, UEEnrollment
from .serializers import AdminEnrollmentSerializer, PedaEnrollmentSerializer, UEEnrollmentSerializer

# Rôles habilités à valider/rejeter une inscription administrative ou
# pédagogique — jamais l'étudiant lui-même.
ENROLLMENT_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite', 'responsable_pedagogique',
)


def _is_enrollment_manager(user):
    return user.is_superuser or user.roles.filter(name__in=ENROLLMENT_MANAGER_ROLES).exists()


class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = AdminEnrollment.objects.all().select_related('student', 'program', 'academic_year').order_by('id')
    serializer_class = AdminEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'program', 'academic_year', 'type']
    search_fields = ['enrollment_number', 'student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AdminEnrollment.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        # Étudiant voit seulement ses inscriptions
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        return qs

    def perform_create(self, serializer):
        # Aucune restriction n'existait ici (contrairement à perform_update/
        # perform_destroy juste en dessous) : le frontend étudiant n'expose
        # pas ce formulaire, mais un POST direct sur /admin-enrollments/
        # permettait à n'importe quel utilisateur authentifié de créer une
        # inscription pour N'IMPORTE QUEL étudiant, avec le statut de son
        # choix.
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        # apps.core.validators.validate_enrollment existe (double inscription,
        # programme actif, capacité, période d'inscription) mais n'était
        # jamais appelée nulle part dans le code — Program.capacity n'était
        # donc appliqué par rien : la scolarité pouvait inscrire un nombre
        # illimité d'étudiants dans un programme. La ValidationError Django
        # levée est convertie en 400 par le exception_handler global (voir
        # apps/core/exceptions.py).
        from apps.core.validators import validate_enrollment
        data = serializer.validated_data
        validate_enrollment(data['student'], data['program'], data['academic_year'])
        serializer.save()

    def perform_update(self, serializer):
        # AdminEnrollmentSerializer n'a que enrollment_number en
        # read_only_fields : status/payment_validated/validated_by/
        # validated_at restaient modifiables par PATCH direct, contournant
        # validate()/validate_payment()/reject() ci-dessous. Confirmé en
        # direct : un étudiant a fait passer son statut "validee" à
        # "rejetee" via PATCH direct (HTTP 200). Reverti après vérification.
        # Pas d'usage frontend d'un PATCH direct sur ce endpoint (seules les
        # 3 actions dédiées sont utilisées) : aucune régression à restreindre
        # entièrement l'update à la scolarité.
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        enrollment = self.get_object()
        # Faille CRITIQUE corrigée : aucun contrôle de rôle — un étudiant
        # pouvait valider LUI-MÊME sa propre inscription (et via
        # validate_payment() ci-dessous, marquer son propre paiement comme
        # validé sans avoir payé). Confirmé en direct sur la prod
        # (reject() puis validate() en tant qu'étudiant, HTTP 200 les deux
        # fois) sur une inscription réelle du jeu de démonstration.
        if not _is_enrollment_manager(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        if not enrollment.payment_validated:
            return Response({'detail': 'Paiement non validé.'}, status=status.HTTP_400_BAD_REQUEST)
        enrollment.status = 'validee'
        enrollment.validated_by = request.user
        enrollment.validated_at = timezone.now()
        enrollment.save()
        # Mettre à jour le statut étudiant
        student = enrollment.student
        student.status = 'inscrit'
        student.current_program = enrollment.program
        student.current_year = enrollment.academic_year
        student.save()

        # Facture de scolarité — EnrollmentService.validate_admin_enrollment()
        # (services.py) fait bien ce travail mais n'est appelé nulle part :
        # cette action-ci (celle réellement branchée sur /validate/) ne
        # générait donc jamais de facture, laissant l'étudiant "validé"
        # sans aucun frais facturé.
        if enrollment.program.fees > 0:
            from .services import EnrollmentService
            EnrollmentService._create_tuition_invoice(enrollment)

        # Inscription pédagogique — rien dans le code ne créait jamais de
        # PedaEnrollment pour un étudiant réel (seul seed_demo_data.py en
        # insère directement en base), ce qui rendait confirm()/
        # auto_enroll_ues() inatteignables en dehors du jeu de démo. On crée
        # ici l'inscription au premier semestre du niveau courant si ce
        # semestre existe pour ce programme ; le statut reste 'en_attente'
        # (confirmation explicite toujours nécessaire via confirm()).
        first_semester_number = (student.current_level - 1) * 2 + 1
        semester = enrollment.program.semesters.filter(number=first_semester_number).first()
        if semester:
            PedaEnrollment.objects.get_or_create(admin_enrollment=enrollment, semester=semester)

        # Notification à l'étudiant
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=student.user.id,
            title='Inscription validée',
            message=f'Votre inscription pour {enrollment.program.name} ({enrollment.academic_year}) a été validée.',
            notif_type='inscription',
            priority='high',
            channel='both',
            action_url='/my-enrollment',
            action_label='Voir mon inscription',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Inscription validée.'})

    @action(detail=True, methods=['post'])
    def validate_payment(self, request, pk=None):
        enrollment = self.get_object()
        if not _is_enrollment_manager(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        enrollment.payment_validated = True
        enrollment.save()
        return Response({'detail': 'Paiement validé.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        enrollment = self.get_object()
        if not _is_enrollment_manager(request.user):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        reason = request.data.get('reason', '')
        enrollment.status = 'rejetee'
        enrollment.save()
        # Notification
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=enrollment.student.user.id,
            title='Inscription rejetée',
            message=f'Votre inscription a été rejetée. Motif: {reason}',
            notif_type='inscription',
            priority='high',
            channel='both',
            action_url='/my-enrollment',
            icon='x-circle',
            color='red'
        )
        return Response({'detail': 'Inscription rejetée.'})

    @action(detail=False, methods=['get'])
    def my_enrollment(self, request):
        """Inscription de l'étudiant connecté"""
        # `except Exception` masquait n'importe quelle erreur (pas seulement
        # l'absence de profil étudiant) sous un message trompeur, rendant le
        # débogage difficile en cas de vrai bug plus loin dans la vue.
        if not hasattr(request.user, 'student_profile'):
            return Response({'error': 'Profil étudiant requis.'}, status=400)
        student = request.user.student_profile
        enrollment = AdminEnrollment.objects.filter(
            student=student, status='validee'
        ).select_related('program', 'academic_year').order_by('-created_at').first()
        if not enrollment:
            return Response({'detail': 'Aucune inscription active.'}, status=404)
        return Response(AdminEnrollmentSerializer(enrollment).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des inscriptions"""
        from django.db.models import Count
        return Response({
            'total': AdminEnrollment.objects.count(),
            'validees': AdminEnrollment.objects.filter(status='validee').count(),
            'en_attente': AdminEnrollment.objects.filter(status='en_attente').count(),
            'rejetees': AdminEnrollment.objects.filter(status='rejetee').count(),
            'by_program': list(AdminEnrollment.objects.filter(status='validee')
                .values('program__name').annotate(count=Count('id')).order_by('-count')[:10])
        })


class PedaEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = PedaEnrollment.objects.all().select_related('admin_enrollment', 'semester').order_by('id')
    serializer_class = PedaEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'semester']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PedaEnrollment.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(admin_enrollment__student=user.student_profile)
        return qs

    def perform_update(self, serializer):
        # `group` n'est pas en read_only_fields et aucun perform_update()
        # n'existait ici (contrairement à AdminEnrollmentViewSet/
        # UEEnrollmentViewSet dans ce même fichier) — un étudiant, dont
        # get_queryset() lui laisse voir SA PROPRE inscription pédagogique,
        # pouvait donc se réassigner lui-même à n'importe quel groupe de TD/TP
        # via un simple PATCH générique, en contournant confirm()/auto_enroll_ues().
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas modifier cette inscription pédagogique.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas supprimer cette inscription pédagogique.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        peda = self.get_object()
        peda.status = 'confirmee'
        peda.confirmed_at = timezone.now()
        peda.save()
        return Response({'detail': 'Inscription pédagogique confirmée.'})

    @action(detail=True, methods=['post'])
    def auto_enroll_ues(self, request, pk=None):
        """Inscrire automatiquement l'étudiant à toutes les UE du semestre"""
        peda = self.get_object()
        ues = peda.semester.ues.filter(is_active=True)
        created = 0
        for ue in ues:
            _, is_new = UEEnrollment.objects.get_or_create(peda_enrollment=peda, ue=ue)
            if is_new:
                created += 1
        return Response({'detail': f'{created} UE inscrites automatiquement.'})


class UEEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = UEEnrollment.objects.all().order_by('id')
    serializer_class = UEEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['peda_enrollment', 'ue']

    def get_queryset(self):
        # Absence totale de filtrage : n'importe quel étudiant authentifié
        # pouvait lister les inscriptions aux UE de TOUS les étudiants du
        # système (fuite de données). Confirmé en direct (35 enregistrements
        # renvoyés à un compte étudiant, toutes UE/tous étudiants confondus).
        if getattr(self, 'swagger_fake_view', False):
            return UEEnrollment.objects.none()
        qs = UEEnrollment.objects.select_related('peda_enrollment__admin_enrollment__student', 'ue')
        user = self.request.user
        if hasattr(user, 'student_profile'):
            return qs.filter(peda_enrollment__admin_enrollment__student=user.student_profile)
        return qs.order_by('id')

    def perform_create(self, serializer):
        # L'auto-inscription légitime aux UE d'un semestre passe déjà par
        # PedaEnrollmentViewSet.auto_enroll_ues (scopé à la propre
        # inscription pédagogique de l'étudiant) — la création directe ici
        # reste donc réservée à la scolarité.
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_update(self, serializer):
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_enrollment_manager(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé à la scolarité.")
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def enrollment_dashboard(request):
    """Tableau de bord scolarité — toutes les valeurs sont calculées depuis la base."""
    from apps.admissions.models import Application
    from apps.documents.models import StudentDocument

    applications = Application.objects.all()
    applications_count = applications.count()
    admitted_count = applications.filter(status__in=['admis', 'converti']).count()
    admission_rate = round((admitted_count / applications_count) * 100) if applications_count else 0
    pending_review = applications.filter(status__in=['soumise', 'en_instruction']).count()

    enrollments = AdminEnrollment.objects.all()
    enrollments_total = enrollments.count()
    enrollments_validated = enrollments.filter(status='validee').count()
    validation_rate = round((enrollments_validated / enrollments_total) * 100) if enrollments_total else 0

    documents = StudentDocument.objects.all()
    documents_total = documents.count()
    pending_verification = documents.filter(status__in=['depose', 'en_verification']).count()
    this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    verified_this_month = documents.filter(status='valide', verified_at__gte=this_month_start).count()

    pending_docs = []
    for doc in documents.filter(status__in=['depose', 'en_verification']).select_related('student__user').order_by('created_at')[:4]:
        age_days = (timezone.now() - doc.created_at).days
        priority = 'haute' if age_days >= 3 else 'moyenne' if age_days >= 1 else 'normale'
        submitted = "Aujourd'hui" if age_days == 0 else "Hier" if age_days == 1 else f"Il y a {age_days} jours"
        pending_docs.append({
            'student': doc.student.user.get_full_name(),
            'document': doc.title,
            'submitted': submitted,
            'priority': priority,
        })

    return Response({
        'admissions': {
            'applications': applications_count,
            'admitted': admitted_count,
            'admission_rate': admission_rate,
            'pending_review': pending_review,
        },
        'enrollment': {
            'total': enrollments_total,
            'validated': enrollments_validated,
            'validation_rate': validation_rate,
        },
        'documents': {
            'pending_verification': pending_verification,
            'verified_this_month': verified_this_month,
            'total': documents_total,
        },
        'pending_docs': pending_docs,
    })
