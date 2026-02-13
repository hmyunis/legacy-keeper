from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, 
    VerifyEmailView, 
    CustomTokenObtainPairView, 
    UserProfileView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify-email'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
]
