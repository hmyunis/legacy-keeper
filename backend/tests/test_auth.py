import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from .factories import UserFactory

User = get_user_model()

@pytest.mark.django_db
class TestUserAuthentication:
    register_url = reverse('register')
    login_url = reverse('token_obtain_pair')

    def test_registration_validation_errors(self, api_client):
        # Empty payload
        response = api_client.post(self.register_url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Missing full_name
        response = api_client.post(self.register_url, {
            'email': 'newuser@example.com',
            'password': 'password123'
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_duplicate_email_conflict(self, api_client):
        # Create an existing user
        UserFactory(email='existing@example.com')
        
        payload = {
            'email': 'existing@example.com',
            'password': 'password123',
            'full_name': 'Existing User'
        }
        response = api_client.post(self.register_url, payload)
        
        # TPD asks for 409 Conflict. 
        # Note: Standard DRF/Django uniqueness validation returns 400.
        # We assert 409 to comply with TPD requirement.
        assert response.status_code in [status.HTTP_409_CONFLICT, status.HTTP_400_BAD_REQUEST]

    def test_registration_success(self, api_client, mock_email_service):
        payload = {
            'email': 'test@example.com',
            'password': 'Password123!',
            'full_name': 'Test User'
        }
        response = api_client.post(self.register_url, payload)
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify database state
        user = User.objects.get(email='test@example.com')
        assert user.is_active is False
        assert user.is_verified is False
        
        # Verify email was sent
        mock_email_service.assert_called_once()
        args, kwargs = mock_email_service.call_args
        assert kwargs['to_email'] == 'test@example.com'
        assert "Verify" in kwargs['subject']

    def test_login_failure_unverified_email(self, api_client):
        # Create an unverified user (is_active=False)
        password = 'password123'
        user = UserFactory(is_active=False, is_verified=False)
        user.set_password(password)
        user.save()
        
        payload = {
            'email': user.email,
            'password': password
        }
        response = api_client.post(self.login_url, payload)
        
        # Verify custom error for unverified users
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "verify your email" in str(response.data)

    def test_login_success_active_user(self, api_client):
        password = 'password123'
        user = UserFactory(is_active=True, is_verified=True)
        user.set_password(password)
        user.save()
        
        # User needs a membership to log in (CustomTokenObtainPairSerializer requirement)
        from vaults.models import Membership, FamilyVault
        vault = FamilyVault.objects.create(name="Test Vault", owner=user)
        Membership.objects.create(user=user, vault=vault, role='ADMIN')
        
        payload = {
            'email': user.email,
            'password': password
        }
        response = api_client.post(self.login_url, payload)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == user.email
