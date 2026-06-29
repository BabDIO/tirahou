from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('course-spaces', views.CourseSpaceViewSet)
router.register('course-modules', views.CourseModuleViewSet)
router.register('course-resources', views.CourseResourceViewSet)
router.register('assignments', views.AssignmentViewSet)
router.register('assignment-submissions', views.AssignmentSubmissionViewSet, basename='assignment-submissions')
router.register('quizzes', views.QuizViewSet)
router.register('student-progress', views.StudentProgressViewSet, basename='student-progress')

urlpatterns = [path('', include(router.urls))]
