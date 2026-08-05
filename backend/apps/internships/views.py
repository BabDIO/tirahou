from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Internship, Thesis, ThesisProgress, Defense
from .serializers import InternshipSerializer, ThesisSerializer, ThesisProgressSerializer, DefenseSerializer

# Rôles administratifs/pédagogiques habilités à valider ou noter un stage /
# mémoire indépendamment d'être ou non le superviseur assigné.
ACADEMIC_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'responsable_pedagogique', 'chef_departement',
)


def _is_academic_manager(user):
    return user.is_superuser or user.roles.filter(name__in=ACADEMIC_MANAGER_ROLES).exists()


def _can_manage_internship(user, internship):
    return _is_academic_manager(user) or internship.supervisor_id == user.id


def _can_manage_thesis(user, thesis):
    return _is_academic_manager(user) or thesis.supervisor_id == user.id or thesis.co_supervisor_id == user.id


MAX_UPLOAD_SIZE_MB = 20
ALLOWED_UPLOAD_EXTENSIONS = ('pdf', 'doc', 'docx')


def _validate_upload(file):
    """Rapport de stage / mémoire final : aucune validation de taille/type
    n'existait sur ces FileField, n'importe quel fichier pouvait être
    déposé. Retourne un message d'erreur, ou None si le fichier est valide."""
    max_size = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file.size > max_size:
        return f'Fichier trop volumineux (max {MAX_UPLOAD_SIZE_MB} Mo).'
    extension = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        return f"Format non autorisé (formats acceptés : {', '.join(ALLOWED_UPLOAD_EXTENSIONS)})."
    return None


class InternshipViewSet(viewsets.ModelViewSet):
    queryset = Internship.objects.all().select_related('student', 'academic_year')
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'academic_year', 'student']
    search_fields = ['company_name', 'subject', 'student__student_id']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Internship.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(supervisor=user)
        return qs

    def perform_create(self, serializer):
        # Un utilisateur SANS student_profile (n'importe quel compte, y
        # compris un enseignant sans lien avec le stage) tombait dans le
        # except et sauvegardait tel quel les données envoyées — student ET
        # supervisor arbitraires. Il pouvait ainsi créer un Internship pour
        # N'IMPORTE QUEL étudiant en se désignant lui-même supervisor, puis
        # légitimement appeler validate()/add_evaluation() dessus.
        user = self.request.user
        if hasattr(user, 'student_profile'):
            serializer.save(student=user.student_profile)
            return
        if not _is_academic_manager(user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas créer de stage.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_internship(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        internship = self.get_object()
        # Sans ce contrôle, l'étudiant pouvait valider LUI-MÊME son propre
        # stage (aucune vérification de rôle n'existait auparavant).
        if not _can_manage_internship(request.user, internship):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        internship.status = 'valide'
        internship.validated_by = request.user
        internship.validated_at = timezone.now()
        internship.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=internship.student.user.id,
            title='Stage validé',
            message=f'Votre stage chez {internship.company_name} a été validé.',
            notif_type='info',
            priority='high',
            action_url='/my-internship',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Stage validé.'})

    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        internship = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Rapport requis.'}, status=400)
        upload_error = _validate_upload(file)
        if upload_error:
            return Response({'detail': upload_error}, status=400)
        internship.report_file = file
        internship.report_submitted_at = timezone.now()
        internship.status = 'rapport_soumis'
        internship.save()
        return Response({'detail': 'Rapport soumis avec succès.'})

    @action(detail=True, methods=['post'])
    def add_evaluation(self, request, pk=None):
        internship = self.get_object()
        # Faille CRITIQUE corrigée : aucune vérification de rôle — un
        # étudiant a pu s'auto-attribuer la note 20/20 de son propre stage
        # via cette action. Confirmé en direct sur la prod (HTTP 200) sur
        # un stage réel du jeu de données de démonstration.
        if not _can_manage_internship(request.user, internship):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        internship.supervisor_grade = request.data.get('grade')
        internship.supervisor_comment = request.data.get('comment', '')
        internship.status = 'evalue'
        internship.save()
        return Response({'detail': 'Évaluation enregistrée.'})


class ThesisViewSet(viewsets.ModelViewSet):
    queryset = Thesis.objects.all().select_related('student', 'supervisor')
    serializer_class = ThesisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['type', 'status', 'academic_year', 'supervisor']
    search_fields = ['title', 'student__student_id', 'student__user__last_name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Thesis.objects.none()
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(supervisor=user)
        return qs

    def perform_create(self, serializer):
        # Même faille que InternshipViewSet.perform_create ci-dessus : un
        # utilisateur sans student_profile pouvait créer une Thesis pour
        # n'importe quel étudiant en se désignant supervisor.
        user = self.request.user
        if hasattr(user, 'student_profile'):
            serializer.save(student=user.student_profile)
            return
        if not _is_academic_manager(user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas créer de mémoire.")
        serializer.save()

    def perform_update(self, serializer):
        # Comme pour Internship : aucun read_only_fields n'existait, un
        # PATCH direct sur /theses/{id}/ aurait pu contourner
        # validate_subject()/reject_subject() ci-dessous. Pas d'usage
        # étudiant de ce endpoint côté frontend (seul submit_final/
        # add_progress y accèdent via actions dédiées), donc restriction
        # complète au directeur de mémoire / administration.
        if not _can_manage_thesis(self.request.user, serializer.instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_thesis(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def validate_subject(self, request, pk=None):
        thesis = self.get_object()
        if not _can_manage_thesis(request.user, thesis):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        thesis.status = 'sujet_valide'
        thesis.validated_by = request.user
        thesis.validated_at = timezone.now()
        thesis.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=thesis.student.user.id,
            title='Sujet de mémoire validé',
            message=f'Votre sujet "{thesis.title}" a été validé.',
            notif_type='info',
            priority='high',
            action_url='/my-internship',
            icon='check-circle',
            color='green'
        )
        return Response({'detail': 'Sujet validé.'})

    @action(detail=True, methods=['post'])
    def reject_subject(self, request, pk=None):
        thesis = self.get_object()
        if not _can_manage_thesis(request.user, thesis):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        reason = request.data.get('reason', '')
        thesis.status = 'sujet_rejete'
        thesis.save()
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=thesis.student.user.id,
            title='Sujet de mémoire rejeté',
            message=f'Votre sujet a été rejeté. Motif: {reason}',
            notif_type='alerte',
            priority='high',
            action_url='/my-internship',
            icon='x-circle',
            color='red'
        )
        return Response({'detail': 'Sujet rejeté.'})

    @action(detail=True, methods=['post'])
    def add_progress(self, request, pk=None):
        thesis = self.get_object()
        # Réservé au directeur de mémoire (ou à l'administration) — action
        # exposée uniquement côté frontend enseignant, mais rien ne
        # l'empêchait côté API.
        if not _can_manage_thesis(request.user, thesis):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ThesisProgressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(thesis=thesis, logged_by=request.user)
            # `progress_percentage` n'existait pas sur le modèle (ajouté
            # ci-dessus) : cette action plantait systématiquement en 500.
            # Bornage [0, 100] car la valeur vient du client.
            raw_percentage = request.data.get('percentage')
            if raw_percentage is not None:
                try:
                    thesis.progress_percentage = max(0, min(100, int(raw_percentage)))
                except (TypeError, ValueError):
                    return Response({'detail': 'percentage doit être un entier entre 0 et 100.'}, status=status.HTTP_400_BAD_REQUEST)
            thesis.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def submit_final(self, request, pk=None):
        thesis = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Fichier requis.'}, status=status.HTTP_400_BAD_REQUEST)
        upload_error = _validate_upload(file)
        if upload_error:
            return Response({'detail': upload_error}, status=status.HTTP_400_BAD_REQUEST)
        thesis.final_file = file
        thesis.status = 'depose'
        thesis.submitted_at = timezone.now()
        thesis.save()

        detail = 'Mémoire déposé avec succès.'
        from .plagiarism import is_configured, submit_for_analysis
        if is_configured():
            result = submit_for_analysis(thesis)
            if result['success']:
                thesis.plagiarism_analysis_id = result['analysis_id']
                thesis.save(update_fields=['plagiarism_analysis_id', 'updated_at'])
                detail += " Analyse anti-plagiat lancée (résultat sous quelques minutes)."
        return Response({'detail': detail})

    @action(detail=True, methods=['get'])
    def check_plagiarism(self, request, pk=None):
        """Interroge le résultat de l'analyse anti-plagiat (Compilatio) si disponible."""
        thesis = self.get_object()
        from .plagiarism import is_configured, get_analysis_result
        if not is_configured():
            return Response({'error': "Service anti-plagiat non configuré."}, status=400)
        if not thesis.plagiarism_analysis_id:
            return Response({'error': "Aucune analyse en cours pour ce mémoire."}, status=400)
        result = get_analysis_result(thesis.plagiarism_analysis_id)
        if result['success'] and result['similarity_percent'] is not None:
            thesis.plagiarism_score = result['similarity_percent']
            thesis.plagiarism_report_url = result['report_url'] or ''
            thesis.save(update_fields=['plagiarism_score', 'plagiarism_report_url', 'updated_at'])
        return Response(result)

    @action(detail=True, methods=['get'])
    def progress_history(self, request, pk=None):
        """Historique des avancées"""
        thesis = self.get_object()
        progresses = ThesisProgress.objects.filter(thesis=thesis).order_by('-created_at')
        return Response(ThesisProgressSerializer(progresses, many=True).data)


class DefenseViewSet(viewsets.ModelViewSet):
    queryset = Defense.objects.all().select_related('thesis')
    serializer_class = DefenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']
    ordering_fields = ['scheduled_date']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Defense.objects.none()
        user = self.request.user
        qs = Defense.objects.select_related('thesis__student__user', 'thesis__supervisor')
        if hasattr(user, 'student_profile'):
            return qs.filter(thesis__student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(thesis__supervisor=user) | qs.filter(thesis__co_supervisor=user)
        return qs

    def perform_create(self, serializer):
        thesis = serializer.validated_data.get('thesis')
        if not (thesis and _can_manage_thesis(self.request.user, thesis)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        serializer.save()

    def perform_update(self, serializer):
        defense = serializer.instance
        is_jury = (
            defense.jury_president_id == self.request.user.id
            or defense.jury_members.filter(id=self.request.user.id).exists()
        )
        if not (_can_manage_thesis(self.request.user, defense.thesis) or is_jury):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_thesis(self.request.user, instance.thesis):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Permission refusée.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Planifier une soutenance"""
        defense = self.get_object()
        if not _can_manage_thesis(request.user, defense.thesis):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        defense.scheduled_date = request.data.get('date')
        defense.location = request.data.get('location', '')
        defense.status = 'planifiee'
        defense.save()
        # Notification à l'étudiant
        from apps.communication.notification_service import NotificationService
        NotificationService.send_notification(
            recipient_id=defense.thesis.student.user.id,
            title='Soutenance planifiée',
            message=f'Votre soutenance est planifiée le {defense.scheduled_date} à {defense.location}.',
            notif_type='rappel',
            priority='urgent',
            action_url='/my-internship',
            icon='calendar',
            color='blue'
        )
        # Génération automatique de la convocation officielle (PDF + QR)
        try:
            import uuid
            from apps.documents.models import GeneratedDocument
            from apps.documents.pdf_service import generate_convocation
            from apps.academic.models import University

            uni = University.objects.filter(is_active=True).first()
            university_name = uni.name if uni else 'Université Virtuelle Hybride'
            verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
            student = defense.thesis.student
            pdf_buf = generate_convocation(
                student.user.get_full_name(),
                f"Soutenance — {defense.thesis.title}",
                str(defense.scheduled_date), defense.location,
                university_name, verification_code,
            )
            doc = GeneratedDocument.objects.create(
                student=student, doc_type='convocation',
                title=f"Convocation soutenance — {defense.thesis.title}",
                verification_code=verification_code, generated_by=request.user,
            )
            doc.file.save(f"convocation_soutenance_{student.student_id}_{verification_code}.pdf", pdf_buf)
        except Exception:
            pass  # La planification reste valide même si la convocation échoue à se générer

        return Response({'detail': 'Soutenance planifiée, convocation générée.'})

    @action(detail=True, methods=['post'])
    def record_grade(self, request, pk=None):
        """Enregistrer la note de soutenance"""
        defense = self.get_object()
        # Faille CRITIQUE : aucun contrôle de rôle sur la note finale de
        # soutenance — sans ce correctif, l'étudiant concerné (qui peut
        # voir sa propre soutenance via get_queryset) aurait pu s'attribuer
        # lui-même sa note de mémoire, qui déclenche en plus la publication
        # automatique du mémoire en bibliothèque (voir plus bas).
        is_jury = (
            defense.jury_president_id == request.user.id
            or defense.jury_members.filter(id=request.user.id).exists()
        )
        if not (_can_manage_thesis(request.user, defense.thesis) or is_jury):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        defense.grade = request.data.get('grade')
        defense.mention = request.data.get('mention', '')
        defense.jury_comments = request.data.get('comments', '')
        defense.status = 'terminee'
        defense.save()
        # Mettre à jour le statut de la thèse
        thesis = defense.thesis
        thesis.status = 'soutenu'
        thesis.save()

        # Publication automatique au catalogue de la bibliothèque, si le
        # mémoire/thèse final a bien été déposé (voir Thesis.submit_final).
        if thesis.final_file:
            from apps.library.models import LibraryDocument

            program = thesis.student.current_program
            doc_type = 'these' if program and program.type == 'doctorat' else 'memoire'
            LibraryDocument.objects.update_or_create(
                title=thesis.title,
                author=thesis.student.user.get_full_name(),
                defaults={
                    'type': doc_type,
                    'year': timezone.now().year,
                    'file': thesis.final_file,
                    'access_level': 'public' if thesis.is_published else 'restricted',
                    'uploaded_by': request.user,
                },
            )

        return Response({'detail': 'Note de soutenance enregistrée, document archivé en bibliothèque.'})
