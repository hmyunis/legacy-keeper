from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lineage', '0002_person_active_story_task_id'),
        ('vaults', '0006_memory_ai_suggestions'),
    ]

    operations = [
        migrations.AddField(
            model_name='memory',
            name='identified_people',
            field=models.ManyToManyField(blank=True, related_name='identified_memories', to='lineage.person'),
        ),
    ]
