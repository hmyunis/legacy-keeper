from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('genealogy', '0004_mediatag_detected_face_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediatag',
            name='tagged_file_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
    ]
