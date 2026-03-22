from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0008_mediaattachment_content_hash'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='restoration_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='restoration_error',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='restoration_processed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='restoration_status',
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
            name='restoration_task_id',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
