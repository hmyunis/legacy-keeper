import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_vaultinvitation_rejected_at_and_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='VaultInviteLink',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('role', models.CharField(choices=[('ADMIN', 'Admin'), ('CONTRIBUTOR', 'Contributor'), ('VIEWER', 'Viewer')], default='VIEWER', max_length=15)),
                ('max_uses', models.PositiveIntegerField(blank=True, null=True)),
                ('uses_count', models.PositiveIntegerField(default=0)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_vault_invite_links', to=settings.AUTH_USER_MODEL)),
                ('vault', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invite_links', to='core.vault')),
            ],
        ),
    ]
