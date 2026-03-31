from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0009_mediaitem_restoration_workflow'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='lock_release_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='mediaitem',
            name='lock_rule',
            field=models.CharField(
                choices=[
                    ('NONE', 'None'),
                    ('TIME', 'Time'),
                    ('TARGETED', 'Targeted Users'),
                    ('TIME_AND_TARGET', 'Time And Targeted Users'),
                    ('TIME_OR_TARGET', 'Time Or Targeted Users'),
                ],
                db_index=True,
                default='NONE',
                max_length=24,
            ),
        ),
        migrations.CreateModel(
            name='MediaItemLockTarget',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'media_item',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='lock_targets',
                        to='media.mediaitem',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='targeted_media_locks',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name='mediaitemlocktarget',
            constraint=models.UniqueConstraint(
                fields=('media_item', 'user'),
                name='uniq_media_item_lock_target_user',
            ),
        ),
        migrations.AddIndex(
            model_name='mediaitemlocktarget',
            index=models.Index(fields=['media_item', 'user'], name='media_mediai_media_i_0f50a8_idx'),
        ),
        migrations.AddIndex(
            model_name='mediaitemlocktarget',
            index=models.Index(fields=['user', 'media_item'], name='media_mediai_user_id_cc0f85_idx'),
        ),
    ]
