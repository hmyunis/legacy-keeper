from django.urls import path

from .views import HelpArticleListView

urlpatterns = [
    path("help/articles/", HelpArticleListView.as_view(), name="help-articles"),
]
