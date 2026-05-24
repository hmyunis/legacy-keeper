from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
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
        info = task.info if isinstance(task.info, dict) else {}

        status_map = {
            'PENDING': 'PROCESSING',
            'STARTED': 'PROCESSING',
            'SUCCESS': 'READY',
            'FAILURE': 'FAILED',
            'RETRY': 'PROCESSING',
            'REVOKED': 'CANCELLED'
        }

        response_data = {
            'task_id': task_id,
            'status': status_map.get(task.status, 'PROCESSING'),
            'progress': info.get('progress', 100 if task.status == 'SUCCESS' else 0),
            'stage': info.get('stage'),
            'result': task.result if task.status == 'SUCCESS' else None,
            'error': 'Task was cancelled.' if task.status == 'REVOKED' else format_task_error(task)
        }

        return Response(response_data)


class TaskCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        task = AsyncResult(task_id)
        task.revoke(terminate=True)
        return Response(
            {
                'task_id': task_id,
                'status': 'CANCELLED',
                'progress': 0,
                'stage': 'Search cancelled',
                'result': None,
                'error': 'Task was cancelled.',
            },
            status=status.HTTP_202_ACCEPTED,
        )
