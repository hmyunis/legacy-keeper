from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('genealogy', '0003_personprofile_birth_place'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediatag',
            name='detected_face_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
    ]
