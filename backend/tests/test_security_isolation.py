import pytest
from django.urls import reverse
from rest_framework import status
from .factories import UserFactory, FamilyVaultFactory, MembershipFactory, MediaItemFactory

@pytest.mark.django_db
class TestSecurityIsolation:
    list_url = reverse('media-list')

    def test_unauthenticated_access_denied(self, api_client):
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_vault_isolation_access_denied(self, api_client):
        # User A and their vault
        user_a = UserFactory()
        vault_a = FamilyVaultFactory(owner=user_a)
        MembershipFactory(user=user_a, vault=vault_a, role='ADMIN')
        
        # User B and their media
        user_b = UserFactory()
        vault_b = FamilyVaultFactory(owner=user_b)
        media_b = MediaItemFactory(vault=vault_b, uploader=user_b, title="Secret B")
        
        # Authenticate as User A
        api_client.force_authenticate(user=user_a)
        
        # Try to access Media B directly
        detail_url = reverse('media-detail', kwargs={'pk': media_b.id})
        response = api_client.get(detail_url)
        
        # Should be 404 because the queryset is filtered by membership
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_vault_isolation_search_filtering(self, api_client):
        user_a = UserFactory()
        vault_a = FamilyVaultFactory(owner=user_a)
        MembershipFactory(user=user_a, vault=vault_a)
        MediaItemFactory(vault=vault_a, uploader=user_a, title="Vault A Photo")
        
        user_b = UserFactory()
        vault_b = FamilyVaultFactory(owner=user_b)
        MembershipFactory(user=user_b, vault=vault_b)
        MediaItemFactory(vault=vault_b, uploader=user_b, title="Vault B Photo")
        
        api_client.force_authenticate(user=user_a)
        
        # Search for "Photo"
        response = api_client.get(self.list_url, {'search': 'Photo'})
        
        assert response.status_code == status.HTTP_200_OK
        # Should only see 1 item (from Vault A)
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == "Vault A Photo"

    def test_inactive_membership_access_denied(self, api_client):
        user = UserFactory()
        vault = FamilyVaultFactory()
        # Inactive membership
        MembershipFactory(user=user, vault=vault, is_active=False)
        MediaItemFactory(vault=vault, title="Hidden Content")
        
        api_client.force_authenticate(user=user)
        response = api_client.get(self.list_url)
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 0
