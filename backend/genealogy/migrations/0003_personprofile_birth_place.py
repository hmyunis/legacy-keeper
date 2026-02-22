from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('genealogy', '0002_alter_relationship_relationship_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='personprofile',
            name='birth_place',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
    ]
