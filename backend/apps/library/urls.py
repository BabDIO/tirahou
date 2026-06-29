from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('library', views.LibraryDocumentViewSet)
router.register('library-borrowings', views.BorrowingViewSet, basename='library-borrowings')
router.register('library-reservations', views.ReservationViewSet, basename='library-reservations')
router.register('library-ratings', views.DocumentRatingViewSet, basename='library-ratings')
router.register('reading-lists', views.ReadingListViewSet, basename='reading-lists')

urlpatterns = [path('', include(router.urls))]
