from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vaults', '0003_memory_human_caption'),
    ]

    operations = [
        migrations.AddField(
            model_name='memory',
            name='is_favorite',
            field=models.BooleanField(default=False),
        ),
    ]
