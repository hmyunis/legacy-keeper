from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'), # We will wire the custom serializer in settings later
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    
    # Onboarding
    path('auth/onboarding/init-vault/', views.InitVaultView.as_view(), name='init-vault'),
    path('auth/onboarding/first-relative/', views.FirstRelativeView.as_view(), name='first-relative'),
    
    # Governance
    path('vaults/<uuid:vault_id>/members/', views.VaultMembersListView.as_view(), name='vault-members'),
    path('vaults/<uuid:vault_id>/members/invite/', views.InviteMemberView.as_view(), name='invite-member'),
    path('vaults/<uuid:vault_id>/logs/', views.VaultLogsView.as_view(), name='vault-logs'),
    path('vaults/<uuid:vault_id>/logs/export/', views.ExportLogsView.as_view(), name='export-logs'),
]