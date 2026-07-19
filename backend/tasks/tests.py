import uuid
from unittest.mock import patch

from django.test import SimpleTestCase

from tasks.ai_pipeline import process_memory_task
from vaults.models import Memory


class ProcessMemoryTaskTests(SimpleTestCase):
    def test_missing_memory_is_skipped_without_failure_state_error(self):
        memory_id = uuid.uuid4()

        with patch("tasks.ai_pipeline.Memory.objects.get", side_effect=Memory.DoesNotExist):
            result = process_memory_task.run(str(memory_id))

        self.assertEqual(result["status"], "SKIPPED")
        self.assertEqual(result["reason"], "memory_not_found")
