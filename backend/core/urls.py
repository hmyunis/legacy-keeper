from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Auth & Profile
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('auth/push-subscribe/', views.PushSubscribeView.as_view(), name='push-subscribe'),
    path('auth/profile/', views.UpdateProfileView.as_view(), name='update-profile'),

    # Onboarding
    path('auth/onboarding/init-vault/', views.InitVaultView.as_view(), name='init-vault'),
    path('auth/onboarding/first-relative/', views.FirstRelativeView.as_view(), name='first-relative'),

    # Governance
    path('vaults/<uuid:vault_id>/members/', views.VaultMembersListView.as_view(), name='vault-members'),
    path('vaults/<uuid:vault_id>/members/invite/', views.InviteMemberView.as_view(), name='invite-member'),
    path('vaults/<uuid:vault_id>/members/<uuid:user_id>/', views.RemoveMemberView.as_view(), name='remove-member'),
    path('vaults/<uuid:vault_id>/pacts/', views.LineagePactRequestView.as_view(), name='lineage-pact'),
    path('vaults/<uuid:vault_id>/logs/', views.VaultLogsView.as_view(), name='vault-logs'),
    path('vaults/<uuid:vault_id>/logs/export/', views.ExportLogsView.as_view(), name='export-logs'),
]