from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import MarketplaceCourse, CourseLesson, CoursePurchase, LessonCompletion, CourseReview
from .serializers import (
    MarketplaceCourseSerializer, MarketplaceCourseDetailSerializer,
    CourseLessonSerializer, CoursePurchaseSerializer, CourseReviewSerializer,
)


class MarketplaceCourseViewSet(viewsets.ModelViewSet):
    """Catalogue du marketplace de cours (création/vente par les enseignants)."""
    queryset = MarketplaceCourse.objects.filter(is_active=True).select_related('teacher')
    serializer_class = MarketplaceCourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'level', 'is_free', 'status']
    search_fields = ['title', 'description', 'category']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return MarketplaceCourse.objects.none()
        user = self.request.user
        qs = MarketplaceCourse.objects.filter(is_active=True).select_related('teacher')
        if user.is_superuser or user.roles.filter(name__in=['super_admin', 'admin_institutionnel']).exists():
            return qs
        if hasattr(user, 'teacher_profile'):
            # L'enseignant voit ses propres cours (tous statuts) + les cours publiés des autres
            return qs.filter(Q(teacher=user) | Q(status='published'))
        return qs.filter(status='published')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MarketplaceCourseDetailSerializer
        return MarketplaceCourseSerializer

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'teacher_profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les enseignants peuvent créer un cours marketplace.")
        serializer.save(teacher=self.request.user)

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        if not hasattr(request.user, 'teacher_profile'):
            return Response({'detail': 'Réservé aux enseignants.'}, status=403)
        courses = MarketplaceCourse.objects.filter(teacher=request.user, is_active=True).order_by('-created_at')
        return Response(MarketplaceCourseSerializer(courses, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        course = self.get_object()
        if course.teacher_id != request.user.id and not request.user.is_superuser:
            return Response({'detail': 'Permission refusée.'}, status=403)
        if not course.lessons.exists():
            return Response({'detail': 'Ajoutez au moins une leçon avant de publier.'}, status=400)
        course.status = 'published'
        course.published_at = timezone.now()
        course.save(update_fields=['status', 'published_at', 'updated_at'])
        return Response(MarketplaceCourseSerializer(course, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        course = self.get_object()
        if course.teacher_id != request.user.id and not request.user.is_superuser:
            return Response({'detail': 'Permission refusée.'}, status=403)
        course.status = 'archived'
        course.save(update_fields=['status', 'updated_at'])
        return Response(MarketplaceCourseSerializer(course, context={'request': request}).data)


class CourseLessonViewSet(viewsets.ModelViewSet):
    """Gestion des leçons — réservé à l'enseignant propriétaire du cours."""
    queryset = CourseLesson.objects.filter(is_active=True).select_related('course')
    serializer_class = CourseLessonSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseLesson.objects.none()
        return CourseLesson.objects.filter(is_active=True).select_related('course')

    def perform_create(self, serializer):
        course = serializer.validated_data.get('course')
        if course.teacher_id != self.request.user.id and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance.course.teacher_id != self.request.user.id and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.course.teacher_id != self.request.user.id and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne gérez pas ce cours.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """L'étudiant marque une leçon comme terminée (doit avoir acheté le cours ou leçon en aperçu)."""
        lesson = self.get_object()
        if not hasattr(request.user, 'student_profile'):
            return Response({'detail': 'Réservé aux étudiants.'}, status=403)
        student = request.user.student_profile
        has_access = lesson.is_preview or CoursePurchase.objects.filter(student=student, course=lesson.course).exists()
        if not has_access:
            return Response({'detail': 'Ce cours n\'a pas été acheté.'}, status=403)
        LessonCompletion.objects.get_or_create(student=student, lesson=lesson)
        return Response({'detail': 'Leçon marquée comme terminée.'})


class CoursePurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """Historique des achats de cours."""
    queryset = CoursePurchase.objects.all().select_related('student__user', 'course')
    serializer_class = CoursePurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['student', 'course']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CoursePurchase.objects.none()
        user = self.request.user
        qs = CoursePurchase.objects.select_related('student__user', 'course')
        if hasattr(user, 'student_profile'):
            return qs.filter(student=user.student_profile)
        if hasattr(user, 'teacher_profile'):
            return qs.filter(course__teacher=user)
        return qs

    @action(detail=False, methods=['get'])
    def my_purchases(self, request):
        if not hasattr(request.user, 'student_profile'):
            return Response({'detail': 'Réservé aux étudiants.'}, status=403)
        purchases = CoursePurchase.objects.filter(student=request.user.student_profile).select_related('course')
        return Response(CoursePurchaseSerializer(purchases, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def purchase(self, request):
        """Achète un cours — débite le portefeuille de points si le cours est payant."""
        if not hasattr(request.user, 'student_profile'):
            return Response({'detail': 'Réservé aux étudiants.'}, status=403)
        student = request.user.student_profile
        course_id = request.data.get('course')
        try:
            course = MarketplaceCourse.objects.get(id=course_id, status='published', is_active=True)
        except MarketplaceCourse.DoesNotExist:
            return Response({'detail': 'Cours introuvable ou non publié.'}, status=404)

        if CoursePurchase.objects.filter(student=student, course=course).exists():
            return Response({'detail': 'Vous possédez déjà ce cours.'}, status=400)

        price = 0 if course.is_free else float(course.price)

        if price > 0:
            from apps.analytics_app.extensions_models import Wallet, WalletTransaction
            wallet, _ = Wallet.objects.get_or_create(student=student)
            if float(wallet.balance) < price:
                return Response({'detail': f'Solde insuffisant. Il vous manque {price - float(wallet.balance):.0f} points.'}, status=400)
            WalletTransaction.objects.create(
                wallet=wallet, type='purchase', amount=price,
                description=f'Achat du cours « {course.title} »',
            )
            wallet.balance -= price
            wallet.total_spent += price
            wallet.save(update_fields=['balance', 'total_spent', 'updated_at'])

        purchase = CoursePurchase.objects.create(student=student, course=course, price_paid=price)
        return Response(CoursePurchaseSerializer(purchase, context={'request': request}).data, status=201)


class CourseReviewViewSet(viewsets.ModelViewSet):
    """Avis des étudiants sur les cours achetés."""
    queryset = CourseReview.objects.all().select_related('student__user', 'course')
    serializer_class = CourseReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CourseReview.objects.none()
        return CourseReview.objects.select_related('student__user', 'course')

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'student_profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Réservé aux étudiants.")
        student = self.request.user.student_profile
        course = serializer.validated_data.get('course')
        if not CoursePurchase.objects.filter(student=student, course=course).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous devez avoir acheté ce cours pour laisser un avis.")
        review = serializer.save(student=student)
        review.course.update_rating()
