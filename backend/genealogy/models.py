from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from core.models import TimeStampedModel
from core.utils import get_upload_path
from vaults.models import FamilyVault
from media.models import MediaItem

class PersonProfile(TimeStampedModel):
    vault = models.ForeignKey(FamilyVault, on_delete=models.CASCADE, related_name='person_profiles')
    
    # Link to a registered user (optional - only if they are on the platform)
    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='person_profile'
    )
    
    full_name = models.CharField(max_length=255)
    maiden_name = models.CharField(max_length=255, blank=True)
    
    # Vital Statistics
    birth_date = models.DateField(null=True, blank=True)
    death_date = models.DateField(null=True, blank=True)
    is_deceased = models.BooleanField(default=False)
    
    # Content
    bio = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to=get_upload_path, null=True, blank=True)

    def __str__(self):
        return f"{self.full_name} ({self.vault.name})"

class Relationship(TimeStampedModel):
    class RelationshipType(models.TextChoices):
        PARENT_OF = 'PARENT_OF', _('Parent Of')
        ADOPTIVE_PARENT_OF = 'ADOPTIVE_PARENT_OF', _('Adoptive Parent Of')
        SPOUSE_OF = 'SPOUSE_OF', _('Spouse Of')
        SIBLING_OF = 'SIBLING_OF', _('Sibling Of')

    from_person = models.ForeignKey(PersonProfile, on_delete=models.CASCADE, related_name='relationships_from')
    to_person = models.ForeignKey(PersonProfile, on_delete=models.CASCADE, related_name='relationships_to')
    relationship_type = models.CharField(max_length=20, choices=RelationshipType.choices)

    class Meta:
        unique_together = ('from_person', 'to_person', 'relationship_type')

    def clean(self):
        # 1. Ensure both people belong to the same vault
        if self.from_person.vault_id != self.to_person.vault_id:
            raise ValidationError("Both people must belong to the same Family Vault.")
        
        # 2. Prevent self-loops
        if self.from_person_id == self.to_person_id:
            raise ValidationError("A person cannot be related to themselves.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.from_person.full_name} is {self.relationship_type} {self.to_person.full_name}"

class MediaTag(TimeStampedModel):
    """
    Links a specific MediaItem to a PersonProfile (e.g., a Face Tag).
    """
    media_item = models.ForeignKey(MediaItem, on_delete=models.CASCADE, related_name='tags')
    person = models.ForeignKey(PersonProfile, on_delete=models.CASCADE, related_name='media_tags')
    
    # Store Face Coordinates: {x: 0.1, y: 0.2, w: 0.1, h: 0.1} (Normalized 0-1)
    # If null, it's just a general tag (person is in the photo, location unknown)
    face_coordinates = models.JSONField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        # Prevent tagging the same person multiple times in one photo (unless we want multiple faces support)
        # For MVP, assume one tag per person per photo.
        unique_together = ('media_item', 'person')

    def clean(self):
        if self.media_item.vault_id != self.person.vault_id:
            raise ValidationError("Media and Person must belong to the same Vault.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
