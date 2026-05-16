from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult

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
            'error': str(task.info) if task.status == 'FAILURE' else None
        }

        return Response(response_data)