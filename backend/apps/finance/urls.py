from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('fee-types', views.FeeTypeViewSet)
router.register('invoices', views.InvoiceViewSet)
router.register('payments', views.PaymentViewSet)
router.register('scholarships', views.ScholarshipViewSet)
router.register('installments', views.InstallmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('finance/cash-journal/', views.cash_journal, name='cash-journal'),
    path('finance/cinetpay/notify/', views.cinetpay_notify, name='cinetpay-notify'),
]
