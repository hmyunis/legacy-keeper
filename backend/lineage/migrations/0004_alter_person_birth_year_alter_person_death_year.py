from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lineage', '0003_person_avatar'),
    ]

    operations = [
        migrations.AlterField(
            model_name='person',
            name='birth_year',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='person',
            name='death_year',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
