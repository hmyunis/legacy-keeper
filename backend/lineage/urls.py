from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:vault_id>/lineage/', views.LineageGraphView.as_view(), name='lineage-graph'),
    path('<uuid:vault_id>/lineage/identify/', views.IdentifyFaceView.as_view(), name='identify-face'),
    path('<uuid:vault_id>/lineage/merge/', views.MergeIdentityView.as_view(), name='merge-identity'),
    path('<uuid:vault_id>/lineage/graft/', views.GraftBranchView.as_view(), name='graft-branch'),
    path('<uuid:vault_id>/lineage/person/<uuid:id>/', views.PersonDetailView.as_view(), name='person-detail'),
    path('<uuid:vault_id>/lineage/person/<uuid:id>/generate-chronicle/', views.GenerateChronicleView.as_view(), name='generate-chronicle'),
    path('<uuid:vault_id>/lineage/person/<uuid:id>/profile/', views.PersonProfileView.as_view(), name='person-profile'),
]
