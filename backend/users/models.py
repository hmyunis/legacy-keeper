from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

from .managers import CustomUserManager
from core.utils import get_upload_path  # Reusing the utility from Core

class User(AbstractUser):
    username = None  # Remove username field
    email = models.EmailField(_('email address'), unique=True)
    
    # Custom fields
    full_name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to=get_upload_path, null=True, blank=True)
    
    # Verification Logic
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_verified = models.BooleanField(default=False)
    reset_password_token = models.UUIDField(null=True, blank=True)
    reset_password_token_expires_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def is_reset_password_token_valid(self, token) -> bool:
        if not self.reset_password_token or not self.reset_password_token_expires_at:
            return False
        if str(self.reset_password_token) != str(token):
            return False
        return self.reset_password_token_expires_at > timezone.now()
