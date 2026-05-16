from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from decouple import config

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/vaults/', include('vaults.urls')),
    path('api/vaults/', include('lineage.urls')),
    path('api/tasks/', include('tasks.urls')),
]

if settings.DEBUG and not config('USE_MINIO', default=False, cast=bool):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)