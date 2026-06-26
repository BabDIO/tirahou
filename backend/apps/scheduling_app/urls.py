from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('rooms', views.RoomViewSet)
router.register('sessions', views.ScheduledSessionViewSet)
router.register('timetables', views.TimetableViewSet)

urlpatterns = [path('', include(router.urls))]
