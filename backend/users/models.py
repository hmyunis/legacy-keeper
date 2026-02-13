from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email
