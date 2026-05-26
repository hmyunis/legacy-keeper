import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_vaultinvitelink'),
    ]

    operations = [
        migrations.CreateModel(
            name='SharedArtifact',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('item_type', models.CharField(choices=[('MEMORY', 'Memory'), ('PERSON', 'Person')], max_length=12)),
                ('object_id', models.UUIDField(db_index=True)),
                ('audience', models.CharField(choices=[('PUBLIC', 'Everyone with the link'), ('AUTHENTICATED', 'Authenticated users only')], default='PUBLIC', max_length=20)),
                ('vault_scope', models.CharField(choices=[('SAME_VAULT', 'Same vault'), ('LINEAGE_PACT', 'Same vault or lineage pact'), ('ANY_VAULT', 'Any vault')], default='SAME_VAULT', max_length=20)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='shared_artifacts', to=settings.AUTH_USER_MODEL)),
                ('vault', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shared_artifacts', to='core.vault')),
            ],
        ),
    ]
