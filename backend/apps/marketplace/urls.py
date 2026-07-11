from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('courses', views.MarketplaceCourseViewSet)
router.register('lessons', views.CourseLessonViewSet)
router.register('purchases', views.CoursePurchaseViewSet)
router.register('reviews', views.CourseReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
