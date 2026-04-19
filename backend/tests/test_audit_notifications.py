import pytest
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status

from audit.models import AuditLog
from notifications.models import InAppNotification
from vaults.models import Membership

from .factories import FamilyVaultFactory, MembershipFactory, UserFactory


@pytest.mark.django_db
class TestAuditAndNotifications:
    def test_admin_can_review_audit_logs(self, api_client):
        admin = UserFactory()
        member = UserFactory()
        vault = FamilyVaultFactory(owner=admin)

        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)
        MembershipFactory(user=member, vault=vault, role=Membership.Roles.CONTRIBUTOR)

        AuditLog.objects.create(
            actor=admin,
            vault_id=vault.id,
            content_type=ContentType.objects.get_for_model(vault),
            object_id=vault.id,
            action=AuditLog.Action.UPDATE,
            changes={'info': 'Vault settings updated'},
        )

        api_client.force_authenticate(user=admin)
        response = api_client.get(reverse('audit-logs-list'), {'vault': str(vault.id)})

        assert response.status_code == status.HTTP_200_OK
        entries = response.data.get('results', response.data)
        assert len(entries) >= 1

    def test_non_admin_cannot_access_audit_logs(self, api_client):
        admin = UserFactory()
        contributor = UserFactory()
        vault = FamilyVaultFactory(owner=admin)

        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)
        MembershipFactory(user=contributor, vault=vault, role=Membership.Roles.CONTRIBUTOR)

        api_client.force_authenticate(user=contributor)
        response = api_client.get(reverse('audit-logs-list'), {'vault': str(vault.id)})

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_audit_log_is_immutable_via_api(self, api_client):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)

        log = AuditLog.objects.create(
            actor=admin,
            vault_id=vault.id,
            content_type=ContentType.objects.get_for_model(vault),
            object_id=vault.id,
            action=AuditLog.Action.CREATE,
            changes={'info': 'Immutable event'},
        )

        api_client.force_authenticate(user=admin)
        url = reverse('audit-logs-detail', kwargs={'pk': log.id})
        response = api_client.patch(url, {'action': AuditLog.Action.DELETE}, format='json')

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_admin_can_export_audit_report(self, api_client):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)

        AuditLog.objects.create(
            actor=admin,
            vault_id=vault.id,
            content_type=ContentType.objects.get_for_model(vault),
            object_id=vault.id,
            action=AuditLog.Action.ACCESS,
            changes={'info': 'Export baseline'},
        )

        api_client.force_authenticate(user=admin)
        response = api_client.get(reverse('audit-logs-export'), {'vault': str(vault.id)})

        assert response.status_code == status.HTTP_200_OK
        assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in response['Content-Type']
        assert 'attachment; filename=' in response['Content-Disposition']

    def test_user_can_mark_notification_as_read(self, api_client):
        user = UserFactory()
        notification = InAppNotification.objects.create(
            recipient=user,
            actor=None,
            vault=None,
            notification_type=InAppNotification.NotificationType.SYSTEM,
            title='New Tag Suggestion',
            message='A photo has an AI tag suggestion to review.',
            route='/vault',
            metadata={'source': 'test'},
            is_read=False,
        )

        api_client.force_authenticate(user=user)

        list_response = api_client.get(reverse('notifications-list'))
        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data['unread_count'] == 1

        read_response = api_client.post(
            reverse('notifications-read', kwargs={'notification_id': notification.id})
        )
        assert read_response.status_code == status.HTTP_200_OK

        notification.refresh_from_db()
        assert notification.is_read is True
        assert notification.read_at is not None
