import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from .factories import UserFactory, FamilyVaultFactory, MembershipFactory, MediaItemFactory

@pytest.mark.django_db
class TestSafetyWindow:
    def test_contributor_delete_within_window_success(self, api_client):
        user = UserFactory()
        # 60 minute safety window
        vault = FamilyVaultFactory(owner=user, safety_window_minutes=60)
        MembershipFactory(user=user, vault=vault, role='CONTRIBUTOR')
        
        # Created now
        media = MediaItemFactory(vault=vault, uploader=user)
        
        api_client.force_authenticate(user=user)
        url = reverse('media-detail', kwargs={'pk': media.id})
        
        # Advance time by 30 minutes (well within 60m window)
        with freeze_time(timezone.now() + timedelta(minutes=30)):
            response = api_client.delete(url)
            assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_contributor_delete_outside_window_failure(self, api_client):
        user = UserFactory()
        vault = FamilyVaultFactory(owner=user, safety_window_minutes=60)
        MembershipFactory(user=user, vault=vault, role='CONTRIBUTOR')
        
        media = MediaItemFactory(vault=vault, uploader=user)
        
        api_client.force_authenticate(user=user)
        url = reverse('media-detail', kwargs={'pk': media.id})
        
        # Advance time by 90 minutes (outside 60m window)
        with freeze_time(timezone.now() + timedelta(minutes=90)):
            response = api_client.delete(url)
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "window expired" in str(response.data)

    def test_admin_delete_outside_window_success(self, api_client):
        owner = UserFactory()
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=owner, safety_window_minutes=60)
        # admin is ADMIN
        MembershipFactory(user=admin, vault=vault, role='ADMIN')
        
        # Contributor uploaded it
        contributor = UserFactory()
        MembershipFactory(user=contributor, vault=vault, role='CONTRIBUTOR')
        media = MediaItemFactory(vault=vault, uploader=contributor)
        
        api_client.force_authenticate(user=admin)
        url = reverse('media-detail', kwargs={'pk': media.id})
        
        # 2 hours later (outside contributor window)
        with freeze_time(timezone.now() + timedelta(hours=2)):
            response = api_client.delete(url)
            # Admins bypass safety window
            assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_ownership_enforcement_prevents_deletion(self, api_client):
        user_a = UserFactory()
        user_b = UserFactory()
        vault = FamilyVaultFactory(owner=user_a, safety_window_minutes=60)
        
        MembershipFactory(user=user_a, vault=vault, role='CONTRIBUTOR')
        MembershipFactory(user=user_b, vault=vault, role='CONTRIBUTOR')
        
        # User B's media
        media_b = MediaItemFactory(vault=vault, uploader=user_b)
        
        api_client.force_authenticate(user=user_a)
        url = reverse('media-detail', kwargs={'pk': media_b.id})
        
        # User A tries to delete User B's media within window
        response = api_client.delete(url)
        
        # Should be 403 Forbidden (Ownership check)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "only delete media they uploaded" in str(response.data)
