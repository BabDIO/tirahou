from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    CourseSpace, CourseModule, CourseResource, Assignment,
    AssignmentSubmission, Quiz, Question, QuizAttempt, StudentProgress,
)
from .serializers import (
    CourseSpaceSerializer, CourseSpaceDetailSerializer, CourseModuleSerializer,
    CourseResourceSerializer, AssignmentSerializer, AssignmentSubmissionSerializer,
    QuizSerializer, QuestionSerializer, QuizAttemptSerializer, StudentProgressSerializer,
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


class CourseResourceViewSet(viewsets.ModelViewSet):
    queryset = CourseResource.objects.all().select_related('module')
    serializer_class = CourseResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['module', 'type', 'is_published']


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all().select_related('course_space')
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'type', 'status']

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

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        quiz = self.get_object()
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'detail': 'Profil étudiant requis.'}, status=status.HTTP_400_BAD_REQUEST)
        attempts_count = QuizAttempt.objects.filter(quiz=quiz, student=student).count()
        if attempts_count >= quiz.max_attempts:
            return Response({'detail': 'Nombre maximum de tentatives atteint.'}, status=status.HTTP_400_BAD_REQUEST)
        attempt = QuizAttempt.objects.create(
            quiz=quiz, student=student, attempt_number=attempts_count + 1
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class StudentProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """Progression des étudiants par espace de cours."""
    serializer_class = StudentProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course_space', 'student']

    def get_queryset(self):
        qs = StudentProgress.objects.select_related('student__user', 'course_space__ue')
        # Si étudiant, ne voir que sa propre progression
        user = self.request.user
        if hasattr(user, 'student_profile'):
            qs = qs.filter(student=user.student_profile)
        return qs
