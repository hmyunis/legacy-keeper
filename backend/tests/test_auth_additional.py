import uuid

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from vaults.models import FamilyVault, Membership

from .factories import UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestUserAccountSecurityAdditional:
    verify_url = reverse('verify-email')
    forgot_password_url = reverse('forgot-password')
    reset_password_url = reverse('reset-password')

    def test_email_verification_activates_user_and_creates_vault(self, api_client):
        user = UserFactory(is_active=False, is_verified=False)

        response = api_client.post(self.verify_url, {'token': str(user.verification_token)})

        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.is_active is True
        assert user.is_verified is True

        vault = FamilyVault.objects.get(owner=user)
        assert Membership.objects.filter(
            user=user,
            vault=vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists()

    def test_email_verification_invalid_token_rejected(self, api_client):
        response = api_client.post(self.verify_url, {'token': str(uuid.uuid4())})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_password_recovery_and_reset_flow(self, api_client, mock_email_service):
        user = UserFactory(is_active=True, is_verified=True)
        user.set_password('OldPassword123!')
        user.save(update_fields=['password'])

        forgot_response = api_client.post(self.forgot_password_url, {'email': user.email})
        assert forgot_response.status_code == status.HTTP_200_OK
        mock_email_service.assert_called_once()

        user.refresh_from_db()
        assert user.reset_password_token is not None
        assert user.reset_password_token_expires_at is not None
        assert user.reset_password_token_expires_at > timezone.now()

        reset_response = api_client.post(
            self.reset_password_url,
            {
                'email': user.email,
                'token': str(user.reset_password_token),
                'new_password': 'NewStrongPassword123!',
            },
        )
        assert reset_response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.check_password('NewStrongPassword123!') is True
        assert user.reset_password_token is None
        assert user.reset_password_token_expires_at is None

    def test_password_reset_with_invalid_token_fails(self, api_client):
        user = UserFactory(is_active=True, is_verified=True)

        response = api_client.post(
            self.reset_password_url,
            {
                'email': user.email,
                'token': str(uuid.uuid4()),
                'new_password': 'AnotherPassword123!',
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
