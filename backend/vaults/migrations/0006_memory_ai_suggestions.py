from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vaults', '0005_memorycollection'),
    ]

    operations = [
        migrations.AddField(
            model_name='memory',
            name='ai_suggestions',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
