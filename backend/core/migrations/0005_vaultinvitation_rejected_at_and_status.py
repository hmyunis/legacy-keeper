from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_vaultinvitation'),
    ]

    operations = [
        migrations.AddField(
            model_name='vaultinvitation',
            name='rejected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='vaultinvitation',
            name='status',
            field=models.CharField(choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('REJECTED', 'Rejected'), ('REVOKED', 'Revoked')], default='PENDING', max_length=10),
        ),
    ]
