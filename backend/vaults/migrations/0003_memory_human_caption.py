from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vaults', '0002_memory_exif_json_memory_is_reviewed'),
    ]

    operations = [
        migrations.AddField(
            model_name='memory',
            name='human_caption',
            field=models.TextField(blank=True, default=''),
        ),
    ]