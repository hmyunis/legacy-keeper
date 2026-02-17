from django.urls import path, include
from rest_framework_nested import routers
from .views import FamilyVaultViewSet, MembershipViewSet, JoinVaultView

# Main router for vaults
router = routers.SimpleRouter()
router.register(r'vaults', FamilyVaultViewSet, basename='vaults')

# Nested router for vault members
vaults_router = routers.NestedSimpleRouter(router, r'vaults', lookup='vault')
vaults_router.register(r'members', MembershipViewSet, basename='vault-members')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(vaults_router.urls)),
    path('join/preview/', JoinVaultView.as_view({'get': 'preview'}), name='join-vault-preview'),
    path('join/accept/', JoinVaultView.as_view({'post': 'accept'}), name='join-vault-accept'),
    path('join/', JoinVaultView.as_view({'post': 'process'}), name='join-vault'),
]
