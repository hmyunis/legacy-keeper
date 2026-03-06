from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0007_mediaitem_face_detection_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaattachment',
            name='content_hash',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
    ]

