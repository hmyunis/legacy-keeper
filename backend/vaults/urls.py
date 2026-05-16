from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:vault_id>/memories/', views.MemoryListCreateView.as_view(), name='memories'),
    path('<uuid:vault_id>/memories/clusters/', views.VaultClustersView.as_view(), name='memory-clusters'),
    path('<uuid:vault_id>/memories/<uuid:id>/restore/', views.MemoryRestoreView.as_view(), name='memory-restore'),
    path('<uuid:vault_id>/search/vibe/', views.VibeSearchView.as_view(), name='vibe-search'),
    path('<uuid:vault_id>/capsules/', views.CapsuleListCreateView.as_view(), name='capsules'),
]