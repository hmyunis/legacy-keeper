from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.db import models
import os

def delete_file_if_unused(file_field):
    """ Helper to delete file from filesystem """
    if file_field and os.path.isfile(file_field.path):
        try:
            os.remove(file_field.path)
        except Exception as e:
            print(f"Error deleting file: {e}")

@receiver(post_delete)
def delete_files_when_row_deleted(sender, instance, **kwargs):
    """
    Signal to delete files from filesystem when the database record is deleted.
    Iterates over all fields of the sender model.
    """
    for field in sender._meta.fields:
        if isinstance(field, (models.FileField, models.ImageField)):
            file_field = getattr(instance, field.name)
            delete_file_if_unused(file_field)

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
                delete_file_if_unused(old_file)
