import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def mock_email_service():
    with patch('core.services.EmailService.send_basic_email') as mocked:
        mocked.return_value = "mocked-id"
        yield mocked

@pytest.fixture
def mock_storage():
    with patch('django.core.files.storage.default_storage.save') as mocked_save, \
         patch('django.core.files.storage.default_storage.delete') as mocked_delete, \
         patch('django.core.files.storage.default_storage.exists') as mocked_exists, \
         patch('django.core.files.storage.default_storage.size') as mocked_size:
        mocked_exists.return_value = False
        mocked_save.return_value = "mock_path.jpg"
        mocked_size.return_value = 1024
        yield {
            'save': mocked_save,
            'delete': mocked_delete,
            'exists': mocked_exists,
            'size': mocked_size
        }

@pytest.fixture
def mock_ai_service():
    with patch('media.services.AIProcessingService.enqueue_media_processing') as mocked_proc, \
         patch('media.services.AIProcessingService.enqueue_media_restoration') as mocked_rest, \
         patch('media.services.AIProcessingService.enqueue_face_detection_only') as mocked_face:
        yield {
            'process': mocked_proc,
            'restore': mocked_rest,
            'face': mocked_face
        }
