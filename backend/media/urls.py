from rest_framework import routers
from django.urls import path, include
from .views import MediaItemViewSet

router = routers.DefaultRouter()
router.register(r'media', MediaItemViewSet, basename='media')

urlpatterns = [
    path('', include(router.urls)),
]
