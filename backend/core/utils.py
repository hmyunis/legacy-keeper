import os
import uuid
from django.utils.deconstruct import deconstructible

@deconstructible
class PathAndRename:
    """
    Callable to generate a unique path for file uploads.
    Used in models.py: file = models.FileField(upload_to=PathAndRename())
    """
    def __call__(self, instance, filename):
        ext = filename.split('.')[-1]
        filename = f'{uuid.uuid4()}.{ext}'
        # This will return a path like 'uploads/model_name/the_uuid.ext'
        return os.path.join('uploads', instance.__class__.__name__.lower(), filename)

# Initialize instance for use in models
get_upload_path = PathAndRename()
