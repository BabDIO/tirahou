from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('universities', views.UniversityViewSet)
router.register('faculties', views.FacultyViewSet)
router.register('departments', views.DepartmentViewSet)
router.register('academic-years', views.AcademicYearViewSet)
router.register('lmd-regulations', views.LMDRegulationViewSet)

urlpatterns = [path('', include(router.urls))]
