from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.db import models
import logging

logger = logging.getLogger(__name__)


def delete_file_if_unused(model, field_name, file_field, instance_pk=None):
    """Delete a file only when no other rows reference the same storage key."""
    if not file_field:
        return

    file_name = str(getattr(file_field, 'name', '') or '').strip()
    if not file_name:
        return

    lookup = {field_name: file_name}
    existing_rows = model._default_manager.filter(**lookup)
    if instance_pk is not None:
        existing_rows = existing_rows.exclude(pk=instance_pk)

    if existing_rows.exists():
        return

    storage = getattr(file_field, 'storage', None)
    if not storage:
        return

    try:
        if storage.exists(file_name):
            storage.delete(file_name)
    except Exception as exc:
        logger.warning("Unable to delete file %s: %s", file_name, exc)

@receiver(post_delete)
def delete_files_when_row_deleted(sender, instance, **kwargs):
    """
    Signal to delete files from filesystem when the database record is deleted.
    Iterates over all fields of the sender model.
    """
    for field in sender._meta.fields:
        if isinstance(field, (models.FileField, models.ImageField)):
            file_field = getattr(instance, field.name)
            delete_file_if_unused(sender, field.name, file_field)

@receiver(pre_save)
def delete_old_file_when_image_updated(sender, instance, **kwargs):
    """
    Signal to delete the old file when a new file is uploaded (update).
    """
    if not instance.pk:
        return  # New object, nothing to delete

    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    for field in sender._meta.fields:
        if isinstance(field, (models.FileField, models.ImageField)):
            old_file = getattr(old_instance, field.name)
            new_file = getattr(instance, field.name)

            # If the file has changed and the old file exists
            if old_file and old_file != new_file:
                delete_file_if_unused(sender, field.name, old_file, instance_pk=instance.pk)
