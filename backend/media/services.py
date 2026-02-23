import logging
import time
from PIL import Image, ExifTags
from django.core.files.base import ContentFile
# import face_recognition  # Install this later for real AI

logger = logging.getLogger(__name__)

class AIProcessingService:
    def process_media(self, media_item):
        """
        Orchestrates processing pipeline:
        1. Extract EXIF (Date/GPS)
        2. Detect Faces (Stubbed)
        """
        media_item.ai_status = media_item.AIStatus.PROCESSING
        media_item.save()

        try:
            # 1. Extract EXIF
            self.extract_exif_metadata(media_item)

            # 2. Detect Faces (Mock for now)
            # In production, this would be: self.detect_faces(media_item)
            time.sleep(1) # Simulate processing time
            
            media_item.ai_status = media_item.AIStatus.COMPLETED
            media_item.save()
            
        except Exception as e:
            logger.error(f"AI Processing failed for {media_item.id}: {str(e)}")
            media_item.ai_status = media_item.AIStatus.FAILED
            media_item.save()

    def extract_exif_metadata(self, media_item):
        """
        Opens image using Pillow and extracts date taken.
        """
        try:
            # Ensure it's an image
            if media_item.media_type != 'PHOTO':
                return

            # Open image from storage
            with Image.open(media_item.file) as img:
                exif_data = img._getexif()
                if not exif_data:
                    return

                # Map Exif codes to names
                exif = {
                    ExifTags.TAGS[k]: v
                    for k, v in exif_data.items()
                    if k in ExifTags.TAGS
                }

                # Save raw exif to metadata field
                # Convert non-serializable objects to string if necessary
                clean_exif = {}
                for k, v in exif.items():
                    if isinstance(v, (str, int, float)):
                        clean_exif[k] = v

                existing_metadata = media_item.metadata if isinstance(media_item.metadata, dict) else {}
                merged_metadata = dict(existing_metadata)
                merged_metadata['exif'] = clean_exif
                media_item.metadata = merged_metadata
                
                # Try to find Date Taken
                date_str = clean_exif.get('DateTimeOriginal') or clean_exif.get('DateTime')
                if date_str:
                    # Parse date string (YYYY:MM:DD HH:MM:SS)
                    # For brevity, skipping rigorous datetime parsing here, 
                    # but you would convert this string to a Python DateTime object
                    pass

                media_item.save()

        except Exception as e:
            print(f"EXIF Extraction Warning: {e}")
