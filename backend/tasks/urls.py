from django.urls import path
from . import views

urlpatterns = [
    path('<str:task_id>/cancel/', views.TaskCancelView.as_view(), name='task-cancel'),
    path('<str:task_id>/', views.TaskStatusView.as_view(), name='task-status'),
]
