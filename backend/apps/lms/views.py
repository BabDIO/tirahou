from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import (
    CourseSpace, CourseModule, CourseResource, Assignment,
    AssignmentSubmission, Quiz, Question, QuizAttempt, StudentAnswer, StudentProgress,
    ResourceCompletion,
)
from .serializers import (
    CourseSpaceSerializer, CourseSpaceDetailSerializer, CourseModuleSerializer,
    CourseResourceSerializer, AssignmentSerializer, AssignmentSubmissionSerializer,
    QuizSerializer, QuestionSerializer, QuizAttemptSerializer, StudentProgressSerializer,
    StudentAnswerSerializer, QuizAttemptDetailSerializer,
)

# Rôles habilités à administrer un espace de cours (création/édition/suppression)
# indépendamment d'être ou non dans CourseSpace.teachers.
LMS_MANAGER_ROLES = (
    'super_admin', 'admin_institutionnel', 'admin_scolarite',
    'responsable_pedagogique', 'chef_departement',
)


def _can_manage_course_space(user, space):
    """Vrai si `user` peut créer/modifier/supprimer du contenu de `space`.

    Aucune de ces vérifications n'existait avant ce correctif : les
    ViewSets n'avaient que des restrictions de LECTURE (get_queryset),
    ce qui laissait n'importe quel utilisateur authentifié — y compris un
    étudiant simplement inscrit — modifier ou supprimer un espace de
    cours, un module, une ressource, un devoir ou un quiz via
    PATCH/PUT/DELETE, du moment qu'il pouvait le voir en GET.
    """
    if user.is_superuser or user.roles.filter(name__in=LMS_MANAGER_ROLES).exists():
        return True
    return space.teachers.filter(id=user.id).exists()


class CourseSpaceViewSet(viewsets.ModelViewSet):
    queryset = CourseSpace.objects.filter(is_active=True).select_related('ue', 'academic_year')
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['mode', 'is_published', 'academic_year']
    search_fields = ['title', 'ue__code', 'ue__name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseSpace.objects.none()
        
        qs = CourseSpace.objects.filter(is_active=True).select_related('ue', 'academic_year')
        user = self.request.user
        
        # Si étudiant, ne voir que les cours auxquels il est inscrit
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            # Récupérer les UE via les inscriptions pédagogiques
            from apps.enrollment.models import PedaEnrollment, UEEnrollment
            
            # Méthode 1 : Via UEEnrollment (plus précis)
            enrolled_ue_ids = list(UEEnrollment.objects.filter(
                peda_enrollment__admin_enrollment__student=student,
                peda_enrollment__status='confirmee'
            ).values_list('ue_id', flat=True))
            
            # Méthode 2 : Via Semester (si pas d'UEEnrollment)
            if not enrolled_ue_ids:
                enrolled_ue_ids = list(PedaEnrollment.objects.filter(
                    admin_enrollment__student=student,
                    status='confirmee'
                ).values_list('semester__ues', flat=True))
            
            # CORRECTION: Filtrer seulement si on a des UE, sinon retourner tous les cours publiés
            if enrolled_ue_ids:
                qs = qs.filter(ue__id__in=enrolled_ue_ids, is_published=True)
            else:
                # Si pas d'inscription, montrer quand même les cours publiés (pour test)
                qs = qs.filter(is_published=True)
        
        # Si enseignant, voir les cours qu'il enseigne
        elif hasattr(user, 'teacher_profile'):
            qs = qs.filter(teachers=user)

        # Super-admins, scolarité, responsables : voir tous les espaces (brouillons inclus)
        elif user.roles.filter(
            name__in=(
                'super_admin',
                'admin_institutionnel',
                'admin_scolarite',
                'responsable_pedagogique',
                'chef_departement',
            )
        ).exists():
            pass
        else:
            # Autres rôles (financier, tuteur, bibliothécaire, etc.) : uniquement publiés
            qs = qs.filter(is_published=True)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseSpaceDetailSerializer
        return CourseSpaceSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.roles.filter(name__in=LMS_MANAGER_ROLES).exists()
                or hasattr(user, 'teacher_profile')):
            raise PermissionDenied("Vous ne pouvez pas créer d'espace de cours.")
        serializer.save()

    def perform_update(self, serializer):
        if not _can_manage_course_space(self.request.user, serializer.instance):
            raise PermissionDenied("Vous ne gérez pas cet espace de cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_course_space(self.request.user, instance):
            raise PermissionDenied("Vous ne gérez pas cet espace de cours.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        space = self.get_object()
        if not _can_manage_course_space(request.user, space):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        space.is_published = True
        space.save()
        return Response({'detail': 'Espace de cours publié.'})

    @action(detail=True, methods=['post'])
    def change_mode(self, request, pk=None):
        space = self.get_object()
        if not _can_manage_course_space(request.user, space):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        new_mode = request.data.get('mode')
        if new_mode not in dict(CourseSpace.MODE_CHOICES):
            return Response({'detail': 'Mode invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        space.mode = new_mode
        space.save()
        return Response({'detail': f'Mode changé en {new_mode}.'})

    @action(detail=True, methods=['get'])
    def my_progress(self, request, pk=None):
        space = self.get_object()
        try:
            from apps.people.models import Student
            student = request.user.student_profile
            progress = StudentProgress.objects.get(student=student, course_space=space)
            return Response(StudentProgressSerializer(progress).data)
        except Exception:
            return Response({'completion_rate': 0})


class CourseModuleViewSet(viewsets.ModelViewSet):
    queryset = CourseModule.objects.all().select_related('course_space')
    serializer_class = CourseModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'is_published']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseModule.objects.none()
        user = self.request.user
        qs = CourseModule.objects.select_related('course_space')
        # Enseignant : seulement ses cours
        if hasattr(user, 'teacher_profile'):
            return qs.filter(course_space__teachers=user)
        # Étudiant : modules publiés, disponibles (available_from atteint) et
        # dont le prérequis éventuel est satisfait (8.16 / H6).
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            base = qs.filter(
                course_space__enrolled_students=student, is_published=True
            ).filter(Q(available_from__isnull=True) | Q(available_from__lte=timezone.now()))
            accessible_ids = [m.id for m in base if m.is_accessible_to(student)]
            return base.filter(id__in=accessible_ids)
        return qs

    def perform_create(self, serializer):
        space = serializer.validated_data.get('course_space')
        if not _can_manage_course_space(self.request.user, space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_update(self, serializer):
        if not _can_manage_course_space(self.request.user, serializer.instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_course_space(self.request.user, instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        instance.delete()

    @action(detail=True, methods=['get'])
    def access_status(self, request, pk=None):
        """Indique si l'étudiant connecté peut accéder à ce module (et pourquoi sinon)."""
        module = self.get_object()
        user = request.user
        if not hasattr(user, 'student_profile'):
            return Response({'accessible': True})
        accessible = module.is_accessible_to(user.student_profile)
        reason = None
        if not accessible:
            if module.available_from and module.available_from > timezone.now():
                reason = f"Disponible à partir du {module.available_from:%d/%m/%Y %H:%M}"
            elif module.prerequisite_module_id:
                reason = f"Terminez d'abord le module « {module.prerequisite_module.title} »"
        return Response({'accessible': accessible, 'reason': reason})


class CourseResourceViewSet(viewsets.ModelViewSet):
    queryset = CourseResource.objects.all().select_related('module')
    serializer_class = CourseResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['module', 'type', 'is_published']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseResource.objects.none()
        user = self.request.user
        qs = CourseResource.objects.select_related('module__course_space')
        if hasattr(user, 'teacher_profile'):
            return qs.filter(module__course_space__teachers=user)
        if hasattr(user, 'student_profile'):
            return qs.filter(
                module__course_space__enrolled_students=user.student_profile,
                is_published=True
            )
        return qs

    def perform_create(self, serializer):
        module = serializer.validated_data.get('module')
        if not _can_manage_course_space(self.request.user, module.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_update(self, serializer):
        if not _can_manage_course_space(self.request.user, serializer.instance.module.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_course_space(self.request.user, instance.module.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """Publie une nouvelle version d'une ressource, en archivant l'ancienne (8.16 / H7)."""
        resource = self.get_object()
        if not _can_manage_course_space(request.user, resource.module.course_space):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        new_resource = resource.create_new_version(
            uploaded_by=request.user,
            file=request.FILES.get('file'),
            external_url=request.data.get('external_url') or None,
            description=request.data.get('description') or None,
        )
        return Response(CourseResourceSerializer(new_resource).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        """Marque une ressource comme consultée/terminée par l'étudiant connecté."""
        resource = self.get_object()
        user = request.user
        if not hasattr(user, 'student_profile'):
            return Response({'error': 'Réservé aux étudiants.'}, status=400)
        ResourceCompletion.objects.get_or_create(student=user.student_profile, resource=resource)
        return Response({'detail': 'Ressource marquée comme terminée.'})


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all().select_related('course_space')
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'type', 'status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Assignment.objects.none()
        user = self.request.user
        qs = Assignment.objects.select_related('course_space')
        # Enseignant : seulement ses cours
        if hasattr(user, 'teacher_profile'):
            return qs.filter(course_space__teachers=user)
        # Étudiant : devoirs publiés de ses cours
        if hasattr(user, 'student_profile'):
            return qs.filter(
                course_space__enrolled_students=user.student_profile,
                status='publie'
            )
        return qs

    def perform_create(self, serializer):
        space = serializer.validated_data.get('course_space')
        if not _can_manage_course_space(self.request.user, space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_update(self, serializer):
        if not _can_manage_course_space(self.request.user, serializer.instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_course_space(self.request.user, instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        # allow_late/max_file_size_mb/allowed_formats/status/open_date
        # existent sur le modèle depuis le début mais n'étaient jamais lus
        # ici (contrairement à Quiz.start_attempt, qui vérifie bien
        # open_date/close_date) — un devoir "fermé" ou pas encore ouvert
        # acceptait quand même des dépôts, en retard ou non selon
        # allow_late, et n'importe quel type/taille de fichier.
        assignment = self.get_object()
        from apps.people.models import Student
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'detail': 'Profil étudiant introuvable.'}, status=status.HTTP_400_BAD_REQUEST)
        if AssignmentSubmission.objects.filter(assignment=assignment, student=student).exists():
            return Response({'detail': 'Devoir déjà soumis.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if assignment.status not in ('publie', 'ferme'):
            return Response({'detail': "Ce devoir n'est pas ouvert aux dépôts."}, status=status.HTTP_400_BAD_REQUEST)
        if assignment.open_date and now < assignment.open_date:
            return Response({'detail': "Ce devoir n'est pas encore ouvert."}, status=status.HTTP_400_BAD_REQUEST)

        is_late = now > assignment.due_date
        if is_late and (not assignment.allow_late or assignment.status == 'ferme'):
            return Response({'detail': 'La date limite de dépôt est dépassée.'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Fichier requis.'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = (assignment.max_file_size_mb or 10) * 1024 * 1024
        if file.size > max_size:
            return Response(
                {'detail': f'Fichier trop volumineux (max {assignment.max_file_size_mb} Mo).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        allowed = [ext.strip().lower() for ext in (assignment.allowed_formats or '').split(',') if ext.strip()]
        extension = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        if allowed and extension not in allowed:
            return Response(
                {'detail': f"Format non autorisé (formats acceptés : {', '.join(allowed)})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission = AssignmentSubmission.objects.create(
            assignment=assignment, student=student, file=file, is_late=is_late
        )
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        assignment = self.get_object()
        if not _can_manage_course_space(request.user, assignment.course_space):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        subs = AssignmentSubmission.objects.filter(assignment=assignment).select_related('student')
        return Response(AssignmentSubmissionSerializer(subs, many=True).data)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all().select_related('course_space')
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'is_published']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Quiz.objects.none()
        user = self.request.user
        qs = Quiz.objects.select_related('course_space')
        if hasattr(user, 'teacher_profile'):
            return qs.filter(course_space__teachers=user)
        if hasattr(user, 'student_profile'):
            return qs.filter(
                course_space__enrolled_students=user.student_profile,
                is_published=True
            )
        return qs

    def perform_create(self, serializer):
        space = serializer.validated_data.get('course_space')
        if not _can_manage_course_space(self.request.user, space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_update(self, serializer):
        if not _can_manage_course_space(self.request.user, serializer.instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_course_space(self.request.user, instance.course_space):
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        import random

        quiz = self.get_object()
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'detail': 'Profil étudiant requis.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if quiz.open_date and now < quiz.open_date:
            return Response({'detail': "Ce quiz n'est pas encore ouvert."}, status=status.HTTP_400_BAD_REQUEST)
        if quiz.close_date and now > quiz.close_date:
            return Response({'detail': 'Ce quiz est clôturé.'}, status=status.HTTP_400_BAD_REQUEST)

        # Expirer les tentatives en cours dont le temps est dépassé
        for stale in QuizAttempt.objects.filter(quiz=quiz, student=student, status='en_cours'):
            if stale.is_time_expired:
                stale.status = 'expire'
                stale.save(update_fields=['status'])

        attempts_count = QuizAttempt.objects.filter(quiz=quiz, student=student).count()
        if attempts_count >= quiz.max_attempts:
            return Response({'detail': 'Nombre maximum de tentatives atteint.'}, status=status.HTTP_400_BAD_REQUEST)

        ongoing = QuizAttempt.objects.filter(quiz=quiz, student=student, status='en_cours').first()
        if ongoing:
            return Response(QuizAttemptSerializer(ongoing).data)

        question_ids = list(quiz.questions.values_list('id', flat=True))
        if quiz.randomize_questions:
            random.shuffle(question_ids)
        attempt = QuizAttempt.objects.create(
            quiz=quiz, student=student, attempt_number=attempts_count + 1,
            question_order=[str(qid) for qid in question_ids],
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class QuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation des tentatives de quiz + soumission des réponses avec
    correction automatique (QCM / QCM multiple / Vrai-Faux). Les questions
    à réponse libre restent en attente de correction manuelle.
    """
    queryset = QuizAttempt.objects.all().select_related('quiz', 'student')
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['quiz', 'status']

    def get_serializer_class(self):
        return QuizAttemptDetailSerializer if self.action == 'retrieve' else QuizAttemptSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return QuizAttempt.objects.none()
        user = self.request.user
        qs = QuizAttempt.objects.select_related('quiz', 'student__user')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(quiz__course_space__teachers=user)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        attempt = self.get_object()
        if attempt.student.user != request.user:
            return Response({'detail': 'Cette tentative ne vous appartient pas.'}, status=status.HTTP_403_FORBIDDEN)
        if attempt.status != 'en_cours':
            return Response({'detail': 'Cette tentative a déjà été soumise.'}, status=status.HTTP_400_BAD_REQUEST)

        if attempt.is_time_expired:
            attempt.status = 'expire'
            attempt.save(update_fields=['status'])
            return Response({'detail': "Temps écoulé — la tentative a été clôturée sans note valable."}, status=status.HTTP_400_BAD_REQUEST)

        answers_data = request.data.get('answers', [])
        question_ids = set(attempt.quiz.questions.values_list('id', flat=True))
        for item in answers_data:
            question_id = item.get('question')
            if question_id not in question_ids and str(question_id) not in {str(q) for q in question_ids}:
                continue
            answer, _ = StudentAnswer.objects.update_or_create(
                attempt=attempt, question_id=question_id,
                defaults={'text_answer': item.get('text_answer', '')},
            )
            choice_ids = item.get('choice_ids') or []
            answer.selected_choices.set(choice_ids)

        attempt.status = 'soumis'
        attempt.submitted_at = timezone.now()
        attempt.save(update_fields=['status', 'submitted_at'])
        attempt.grade()

        return Response(QuizAttemptDetailSerializer(attempt).data)

    @action(detail=True, methods=['post'], url_path='grade-answer')
    def grade_answer(self, request, pk=None):
        """Correction manuelle d'une réponse libre par l'enseignant."""
        attempt = self.get_object()
        if not hasattr(request.user, 'teacher_profile') and not request.user.is_superuser:
            return Response({'detail': 'Réservé aux enseignants.'}, status=status.HTTP_403_FORBIDDEN)
        answer_id = request.data.get('answer_id')
        try:
            answer = attempt.answers.get(id=answer_id)
        except StudentAnswer.DoesNotExist:
            return Response({'detail': 'Réponse introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            points = float(request.data.get('points_earned'))
        except (TypeError, ValueError):
            return Response({'detail': 'points_earned doit être un nombre.'}, status=status.HTTP_400_BAD_REQUEST)
        # Non borné auparavant : un enseignant pouvait saisir une valeur
        # négative ou dépassant le maximum de la question.
        max_points = float(answer.question.points)
        points = max(0.0, min(points, max_points))
        answer.points_earned = points
        answer.is_correct = points >= max_points
        answer.save(update_fields=['points_earned', 'is_correct'])
        attempt.grade()
        return Response(QuizAttemptDetailSerializer(attempt).data)


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    """Soumissions de devoirs — lecture + correction."""
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['assignment', 'student', 'status']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AssignmentSubmission.objects.none()
        user = self.request.user
        qs = AssignmentSubmission.objects.select_related('assignment', 'student__user')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        # Sans ce filtre, un enseignant (ou toute autre personne authentifiée
        # sans profil étudiant) voyait — et pouvait noter — les rendus de
        # TOUS les cours, pas seulement les siens.
        if user.is_superuser or user.roles.filter(name__in=LMS_MANAGER_ROLES).exists():
            return qs
        return qs.filter(assignment__course_space__teachers=user)

    def perform_update(self, serializer):
        # get_queryset() renvoie à l'étudiant SES PROPRES rendus, donc sans
        # ce contrôle il pouvait PATCHer directement grade/status via le
        # endpoint générique (MyAssignmentsPage.tsx s'en sert pour noter,
        # donc les champs ne peuvent pas être passés en read_only_fields —
        # seul un rôle habilité doit pouvoir déclencher ce PATCH du tout).
        submission = serializer.instance
        if not _can_manage_course_space(self.request.user, submission.assignment.course_space):
            raise PermissionDenied("Vous ne pouvez pas modifier ce rendu.")
        extra = {}
        if 'grade' in serializer.validated_data:
            extra['graded_by'] = self.request.user
            extra['graded_at'] = timezone.now()
        serializer.save(**extra)

    @action(detail=True, methods=['patch'])
    def grade(self, request, pk=None):
        """Corriger un rendu (enseignant)."""
        submission = self.get_object()
        # Faille corrigée : rien n'empêchait auparavant un étudiant de
        # s'auto-noter via cette action (confirmé en direct sur la prod :
        # un compte étudiant a pu se mettre 20/20 sur son propre devoir).
        if not _can_manage_course_space(request.user, submission.assignment.course_space):
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        grade_val = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        if grade_val is None:
            return Response({'detail': 'grade requis.'}, status=status.HTTP_400_BAD_REQUEST)
        submission.grade = grade_val
        submission.feedback = feedback
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.status = 'corrige'
        submission.save()
        # Notifier l'étudiant
        try:
            from apps.communication.models import Notification
            Notification.objects.create(
                recipient=submission.student.user,
                title=f"Devoir corrigé — {submission.assignment.title}",
                message=f"Votre devoir a été corrigé. Note : {grade_val}/20",
                type='resultat', priority='high',
                action_url='/my-assignments',
                icon='check-circle', color='emerald',
                is_sent=True, sent_at=timezone.now()
            )
        except Exception:
            pass
        return Response(AssignmentSubmissionSerializer(submission).data)


class StudentProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """Progression des étudiants par espace de cours."""
    serializer_class = StudentProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'student']

    def get_queryset(self):
        qs = StudentProgress.objects.select_related('student__user', 'course_space__ue')
        user = self.request.user
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        # Aucune restriction ne s'appliquait ici pour les non-étudiants :
        # un enseignant sans lien avec le cours, ou tout autre compte
        # authentifié, pouvait lister la progression de TOUS les
        # étudiants sur TOUS les cours (contrairement à chaque autre
        # ViewSet de ce fichier, qui filtre les enseignants sur leurs
        # propres course_space via _can_manage_course_space).
        if user.is_superuser or user.roles.filter(name__in=LMS_MANAGER_ROLES).exists():
            return qs
        if hasattr(user, 'teacher_profile'):
            return qs.filter(course_space__teachers=user)
        return StudentProgress.objects.none()
