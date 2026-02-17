from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, 
    VerifyEmailView, 
    ResendVerificationEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    CustomTokenObtainPairView, 
    UserProfileView,
    GoogleOAuthLoginView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification-email'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('google/login/', GoogleOAuthLoginView.as_view(), name='google-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
]
