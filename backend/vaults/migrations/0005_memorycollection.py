import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_actionlog_target_id_actionlog_target_type_and_more'),
        ('vaults', '0004_memory_is_favorite'),
    ]

    operations = [
        migrations.CreateModel(
            name='MemoryCollection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('vault', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memory_collections', to='core.vault')),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('vault', 'name')},
            },
        ),
    ]
