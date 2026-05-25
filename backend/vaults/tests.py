from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Vault, VaultMember
from vaults.models import Capsule


User = get_user_model()


class CapsuleDeletionTests(APITestCase):
    def setUp(self):
        self.vault = Vault.objects.create(name='Family Vault')
        self.author = User.objects.create_user(
            email='author@example.com',
            full_name='Author User',
            password='password123',
            is_verified=True,
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            full_name='Other User',
            password='password123',
            is_verified=True,
        )
        VaultMember.objects.create(user=self.author, vault=self.vault, role='ADMIN')
        VaultMember.objects.create(user=self.other_user, vault=self.vault, role='CONTRIBUTOR')

        self.capsule = Capsule.objects.create(
            vault=self.vault,
            title='Letters to the Future',
            unlock_date=timezone.now() + timedelta(days=7),
            status='LOCKED',
            sealed_by=self.author,
            message='Do not open yet.',
        )

    def test_only_author_can_delete_capsule(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(f'/api/vaults/{self.vault.id}/capsules/{self.capsule.id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Capsule.objects.filter(id=self.capsule.id).exists())

    def test_author_can_delete_capsule(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.delete(f'/api/vaults/{self.vault.id}/capsules/{self.capsule.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Capsule.objects.filter(id=self.capsule.id).exists())
