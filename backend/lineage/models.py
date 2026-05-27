import uuid

from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from pgvector.django import VectorField

from core.models import Vault
from vaults.models import Memory


class Person(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name="people")
    name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=100, blank=True
    )  # Curator/Identity Role (e.g., Patriarch, Matriarch)
    birth_year = models.CharField(max_length=20, blank=True)
    death_year = models.CharField(max_length=20, null=True, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)  # Native avatar upload
    avatar_url = models.URLField(blank=True)  # Retrocompatible remote fallback
    biography = models.TextField(blank=True)
    active_story_task_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.name


class PersonFaceEmbedding(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="face_embeddings")
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name="detected_faces")
    bounding_box = models.JSONField()  # [top, right, bottom, left]
    embedding_vector = VectorField(dimensions=128)


class KinshipEdge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name="kinship_edges")
    from_person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="outgoing_edges")
    to_person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="incoming_edges")
    relationship_type = models.CharField(max_length=50)  # 'PARENT_OF', 'SPOUSE_OF'


@receiver(post_delete, sender=Person)
def auto_delete_avatar_on_delete(sender, instance, **kwargs):
    if instance.avatar:
        instance.avatar.delete(save=False)
