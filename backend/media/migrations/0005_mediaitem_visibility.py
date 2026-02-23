from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0004_mediaattachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='visibility',
            field=models.CharField(
                choices=[('PRIVATE', 'Private'), ('FAMILY', 'Family')],
                default='FAMILY',
                max_length=20,
            ),
        ),
    ]
