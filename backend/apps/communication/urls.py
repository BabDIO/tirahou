from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notification')
router.register('announcements', views.AnnouncementViewSet)
router.register('messages', views.MessageViewSet, basename='message')
router.register('forums', views.ForumViewSet)
router.register('forum-posts', views.ForumPostViewSet)
router.register('push-subscriptions', views.PushSubscriptionViewSet, basename='push-subscription')

urlpatterns = [
    path('push/vapid-public-key/', views.vapid_public_key, name='vapid_public_key'),
    path('', include(router.urls)),
]
