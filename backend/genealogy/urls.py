from rest_framework import routers
from django.urls import path, include
from .views import PersonProfileViewSet, RelationshipViewSet, MediaTagViewSet

router = routers.DefaultRouter()
router.register(r'profiles', PersonProfileViewSet, basename='profiles')
router.register(r'relationships', RelationshipViewSet, basename='relationships')
router.register(r'tags', MediaTagViewSet, basename='tags')

urlpatterns = [
    path('genealogy/', include(router.urls)),
]
