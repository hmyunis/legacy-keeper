import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from vaults.models import Invite, Membership

from .factories import FamilyVaultFactory, MembershipFactory, UserFactory


@pytest.mark.django_db
class TestVaultMembershipGovernance:
    def test_admin_can_invite_member_via_email(self, api_client, mock_email_service):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)

        api_client.force_authenticate(user=admin)
        url = reverse('vaults-invite', kwargs={'pk': vault.id})

        payload = {
            'email': 'invitee@example.com',
            'role': Membership.Roles.CONTRIBUTOR,
        }
        response = api_client.post(url, payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert Invite.objects.filter(
            vault=vault,
            email='invitee@example.com',
            role=Membership.Roles.CONTRIBUTOR,
            is_used=False,
            expires_at__gt=timezone.now(),
        ).exists()
        mock_email_service.assert_called_once()

    def test_non_admin_cannot_change_member_role(self, api_client):
        owner = UserFactory()
        editor = UserFactory()
        target = UserFactory()
        vault = FamilyVaultFactory(owner=owner)

        MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)
        MembershipFactory(user=editor, vault=vault, role=Membership.Roles.CONTRIBUTOR)
        target_membership = MembershipFactory(
            user=target,
            vault=vault,
            role=Membership.Roles.CONTRIBUTOR,
        )

        api_client.force_authenticate(user=editor)
        url = reverse('vault-members-detail', kwargs={'vault_pk': vault.id, 'pk': target_membership.id})
        response = api_client.patch(url, {'role': Membership.Roles.VIEWER}, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_change_member_role(self, api_client):
        owner = UserFactory()
        target = UserFactory()
        vault = FamilyVaultFactory(owner=owner)

        MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)
        target_membership = MembershipFactory(
            user=target,
            vault=vault,
            role=Membership.Roles.CONTRIBUTOR,
        )

        api_client.force_authenticate(user=owner)
        url = reverse('vault-members-detail', kwargs={'vault_pk': vault.id, 'pk': target_membership.id})
        response = api_client.patch(url, {'role': Membership.Roles.VIEWER}, format='json')

        assert response.status_code == status.HTTP_200_OK
        target_membership.refresh_from_db()
        assert target_membership.role == Membership.Roles.VIEWER

    def test_owner_can_transfer_ownership(self, api_client):
        owner = UserFactory()
        owner.set_password('OwnerPassword123!')
        owner.save(update_fields=['password'])

        successor = UserFactory()
        vault = FamilyVaultFactory(owner=owner)

        owner_membership = MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)
        successor_membership = MembershipFactory(
            user=successor,
            vault=vault,
            role=Membership.Roles.CONTRIBUTOR,
        )

        api_client.force_authenticate(user=owner)
        url = reverse('vaults-transfer-ownership', kwargs={'pk': vault.id})
        response = api_client.post(
            url,
            {
                'membershipId': str(successor_membership.id),
                'password': 'OwnerPassword123!',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK

        vault.refresh_from_db()
        owner_membership.refresh_from_db()
        successor_membership.refresh_from_db()

        assert vault.owner_id == successor.id
        assert owner_membership.role == Membership.Roles.CONTRIBUTOR
        assert successor_membership.role == Membership.Roles.ADMIN

    def test_non_admin_member_can_leave_vault(self, api_client):
        owner = UserFactory()
        member = UserFactory()
        vault = FamilyVaultFactory(owner=owner)

        MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)
        member_membership = MembershipFactory(
            user=member,
            vault=vault,
            role=Membership.Roles.CONTRIBUTOR,
        )

        api_client.force_authenticate(user=member)
        url = reverse('vaults-leave', kwargs={'pk': vault.id})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert Membership.objects.filter(id=member_membership.id).exists() is False

    def test_admin_cannot_leave_without_transfer(self, api_client):
        owner = UserFactory()
        vault = FamilyVaultFactory(owner=owner)
        MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)

        api_client.force_authenticate(user=owner)
        url = reverse('vaults-leave', kwargs={'pk': vault.id})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
