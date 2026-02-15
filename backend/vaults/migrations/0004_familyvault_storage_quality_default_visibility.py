from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('vaults', '0003_familyvault_family_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='familyvault',
            name='default_visibility',
            field=models.CharField(
                choices=[('PRIVATE', 'Private'), ('FAMILY', 'Family')],
                default='FAMILY',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='familyvault',
            name='storage_quality',
            field=models.CharField(
                choices=[('BALANCED', 'Balanced'), ('HIGH', 'High'), ('ORIGINAL', 'Original')],
                default='HIGH',
                max_length=20,
            ),
        ),
    ]

