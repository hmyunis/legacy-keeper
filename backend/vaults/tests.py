from datetime import timedelta
import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Vault, VaultMember
from vaults.models import Capsule, Memory


User = get_user_model()
SMART_PURGE_MEDIA_ROOT = tempfile.mkdtemp()


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


@override_settings(MEDIA_ROOT=SMART_PURGE_MEDIA_ROOT)
class SmartPurgeTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(SMART_PURGE_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.vault = Vault.objects.create(name='Family Vault')
        self.admin = User.objects.create_user(
            email='admin@example.com',
            full_name='Admin User',
            password='password123',
            is_verified=True,
        )
        VaultMember.objects.create(user=self.admin, vault=self.vault, role='ADMIN')
        self.client.force_authenticate(user=self.admin)

    def _image_upload(self, name='photo.jpg', color=(120, 90, 40)):
        buffer = BytesIO()
        Image.new('RGB', (24, 24), color=color).save(buffer, format='JPEG')
        return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')

    def test_preview_detects_exact_duplicate_uploads_without_existing_phash(self):
        first = Memory.objects.create(
            vault=self.vault,
            title='First',
            original_file=self._image_upload('first.jpg'),
            phash='',
            exif_json={},
        )
        second = Memory.objects.create(
            vault=self.vault,
            title='Second',
            original_file=self._image_upload('second.jpg'),
            phash='',
            exif_json={},
        )

        response = self.client.get(f'/api/vaults/{self.vault.id}/memories/purge/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['candidate_count'], 1)
        self.assertEqual(len(response.data['groups']), 1)
        self.assertEqual(response.data['groups'][0]['match_type'], 'exact_file')
        self.assertEqual({item['id'] for item in response.data['groups'][0]['items']}, {str(first.id), str(second.id)})

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertTrue(first.exif_json.get('sha256'))
        self.assertTrue(second.exif_json.get('sha256'))
        self.assertTrue(first.phash)
        self.assertTrue(second.phash)

    def test_confirm_purge_deletes_selected_duplicate_but_keeps_one_artifact(self):
        keeper = Memory.objects.create(
            vault=self.vault,
            title='Keeper',
            original_file=self._image_upload('keeper.jpg'),
            exif_json={},
        )
        duplicate = Memory.objects.create(
            vault=self.vault,
            title='Duplicate',
            original_file=self._image_upload('duplicate.jpg'),
            exif_json={},
        )

        preview = self.client.get(f'/api/vaults/{self.vault.id}/memories/purge/')
        selected_id = preview.data['default_delete_ids'][0]

        response = self.client.post(
            f'/api/vaults/{self.vault.id}/memories/purge/',
            {'memory_ids': [selected_id]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['purged'], 1)
        self.assertEqual(Memory.objects.filter(vault=self.vault).count(), 1)
        self.assertTrue(Memory.objects.filter(id=keeper.id).exists() or Memory.objects.filter(id=duplicate.id).exists())

    def test_confirm_all_pending_memories_marks_unreviewed_artifacts_reviewed(self):
        Memory.objects.create(
            vault=self.vault,
            title='Pending One',
            original_file=self._image_upload('pending-one.jpg'),
            is_reviewed=False,
        )
        Memory.objects.create(
            vault=self.vault,
            title='Pending Two',
            original_file=self._image_upload('pending-two.jpg', color=(30, 80, 110)),
            is_reviewed=False,
        )
        reviewed = Memory.objects.create(
            vault=self.vault,
            title='Already Reviewed',
            original_file=self._image_upload('reviewed.jpg', color=(200, 20, 30)),
            is_reviewed=True,
        )

        response = self.client.post(f'/api/vaults/{self.vault.id}/memories/confirm-all/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['confirmed'], 2)
        self.assertFalse(Memory.objects.filter(vault=self.vault, is_reviewed=False).exists())
        reviewed.refresh_from_db()
        self.assertTrue(reviewed.is_reviewed)
