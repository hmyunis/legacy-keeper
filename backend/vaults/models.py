import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from pgvector.django import VectorField
from core.models import Vault, User

class Memory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='memories')
    
    original_file = models.ImageField(upload_to='vaults/originals/')
    restored_file = models.ImageField(upload_to='vaults/restored/', null=True, blank=True)
    
    title = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    date = models.DateField(null=True, blank=True)
    year = models.CharField(max_length=4, blank=True)
    
    cluster_name = models.CharField(max_length=100, default='Unsorted')
    ai_caption = models.TextField(blank=True)
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    
    # AI / ML Fields
    clip_embedding = VectorField(dimensions=512, null=True, blank=True) # For Vibe Search
    phash = models.CharField(max_length=64, blank=True) # Perceptual hash for deduplication
    
    created_at = models.DateTimeField(auto_now_add=True)

class Capsule(models.Model):
    STATUS_CHOICES = (
        ('LOCKED', 'Locked'),
        ('READY', 'Ready'),
        ('OPENED', 'Opened'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='capsules')
    title = models.CharField(max_length=255)
    unlock_date = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='LOCKED')
    sealed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message = models.TextField(blank=True)
    memories = models.ManyToManyField(Memory, related_name='capsules', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)