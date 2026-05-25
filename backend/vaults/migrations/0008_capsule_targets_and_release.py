from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('vaults', '0007_memory_identified_people'),
    ]

    operations = [
        migrations.AddField(
            model_name='capsule',
            name='added_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='capsule',
            name='added_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='added_capsules', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='capsule',
            name='added_to_vault',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='capsule',
            name='is_public',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='capsule',
            name='target_users',
            field=models.ManyToManyField(blank=True, related_name='targeted_capsules', to=settings.AUTH_USER_MODEL),
        ),
    ]
