from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:vault_id>/lineage/', views.LineageGraphView.as_view(), name='lineage-graph'),
    path('<uuid:vault_id>/lineage/graft/', views.GraftBranchView.as_view(), name='graft-branch'),
    path('<uuid:vault_id>/lineage/person/<uuid:id>/generate-chronicle/', views.GenerateChronicleView.as_view(), name='generate-chronicle'),
]