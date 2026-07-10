from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/mfa/setup/', views.MfaSetupView.as_view(), name='mfa_setup'),
    path('auth/mfa/verify-setup/', views.MfaVerifySetupView.as_view(), name='mfa_verify_setup'),
    path('auth/mfa/disable/', views.MfaDisableView.as_view(), name='mfa_disable'),
    path('users/', views.UserListCreateView.as_view(), name='user_list'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<uuid:user_id>/roles/', views.assign_roles, name='assign_roles'),
    path('roles/', views.RoleListCreateView.as_view(), name='role_list'),
    path('roles/<uuid:pk>/', views.RoleDetailView.as_view(), name='role_detail'),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_logs'),
]
