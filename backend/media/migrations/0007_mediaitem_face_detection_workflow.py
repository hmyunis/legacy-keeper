from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0006_mediaitem_exif_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='face_detection_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='face_detection_error',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='face_detection_processed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='face_detection_status',
            field=models.CharField(
                choices=[
                    ('NOT_STARTED', 'Not Started'),
                    ('QUEUED', 'Queued'),
                    ('PROCESSING', 'Processing'),
                    ('COMPLETED', 'Completed'),
                    ('NOT_AVAILABLE', 'Not Available'),
                    ('FAILED', 'Failed'),
                ],
                db_index=True,
                default='NOT_STARTED',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='face_detection_task_id',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
