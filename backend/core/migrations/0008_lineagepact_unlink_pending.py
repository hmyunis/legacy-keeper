from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_sharedartifact'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lineagepact',
            name='status',
            field=models.CharField(choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('UNLINK_PENDING', 'Unlink Pending')], default='PENDING', max_length=20),
        ),
        migrations.AddField(
            model_name='lineagepact',
            name='unlink_requested_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='lineagepact',
            name='unlink_requested_by_vault',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='unlink_requested_pacts', to='core.vault'),
        ),
    ]
