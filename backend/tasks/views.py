from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult


UNREGISTERED_TASK_HINTS = {
    'tasks.ai_pipeline.process_memory_task': (
        "AI worker rejected the reprocess job because its running Celery process "
        "has not registered tasks.ai_pipeline.process_memory_task. Restart the "
        "Celery worker after pulling this code and confirm it is listening to "
        "the high_priority queue."
    )
}


def format_task_error(task):
    if task.status != 'FAILURE':
        return None

    raw_error = str(task.info)
    task_name = raw_error.strip("\"'")
    return UNREGISTERED_TASK_HINTS.get(task_name, raw_error)


class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        task = AsyncResult(task_id)

        status_map = {
            'PENDING': 'PROCESSING',
            'STARTED': 'PROCESSING',
            'SUCCESS': 'READY',
            'FAILURE': 'FAILED',
            'RETRY': 'PROCESSING',
            'REVOKED': 'FAILED'
        }

        response_data = {
            'task_id': task_id,
            'status': status_map.get(task.status, 'PROCESSING'),
            'progress': 100 if task.status == 'SUCCESS' else 0,
            'result': task.result if task.status == 'SUCCESS' else None,
            'error': format_task_error(task)
        }

        return Response(response_data)
