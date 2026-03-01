from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # App URLs
    path('api/', include('core.urls')),
    path('api/users/', include('users.urls')),
    path('api/', include('vaults.urls')),
    path('api/', include('media.urls')),
    path('api/', include('genealogy.urls')),
    path('api/', include('audit.urls')),
    path('api/', include('notifications.urls')),
]

if settings.DEBUG and not getattr(settings, 'USE_S3', False) and getattr(settings, 'MEDIA_ROOT', None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
