from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
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

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        space = self.get_object()
        space.is_published = True
        space.save()
        return Response({'detail': 'Espace de cours publié.'})

    @action(detail=True, methods=['post'])
    def change_mode(self, request, pk=None):
        space = self.get_object()
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

    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """Publie une nouvelle version d'une ressource, en archivant l'ancienne (8.16 / H7)."""
        resource = self.get_object()
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

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        from apps.people.models import Student
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'detail': 'Profil étudiant introuvable.'}, status=status.HTTP_400_BAD_REQUEST)
        if AssignmentSubmission.objects.filter(assignment=assignment, student=student).exists():
            return Response({'detail': 'Devoir déjà soumis.'}, status=status.HTTP_400_BAD_REQUEST)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Fichier requis.'}, status=status.HTTP_400_BAD_REQUEST)
        is_late = timezone.now() > assignment.due_date
        submission = AssignmentSubmission.objects.create(
            assignment=assignment, student=student, file=file, is_late=is_late
        )
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        assignment = self.get_object()
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
        points = request.data.get('points_earned')
        try:
            answer = attempt.answers.get(id=answer_id)
        except StudentAnswer.DoesNotExist:
            return Response({'detail': 'Réponse introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        answer.points_earned = points
        answer.is_correct = float(points) >= float(answer.question.points)
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
        return qs

    @action(detail=True, methods=['patch'])
    def grade(self, request, pk=None):
        """Corriger un rendu (enseignant)."""
        submission = self.get_object()
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
            qs = qs.filter(student=user.student_profile)
        return qs
