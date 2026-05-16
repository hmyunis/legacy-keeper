from django.urls import path
from . import views

urlpatterns = [
    path('<str:task_id>/', views.TaskStatusView.as_view(), name='task-status'),
]