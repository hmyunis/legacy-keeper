from rest_framework import routers
from django.urls import path, include
from .views import AuditLogViewSet

router = routers.DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('audit/', include(router.urls)),
]
