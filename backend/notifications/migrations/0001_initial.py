from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('vaults', '0003_familyvault_family_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('in_app_enabled', models.BooleanField(default=True)),
                ('push_enabled', models.BooleanField(default=True)),
                ('new_uploads', models.BooleanField(default=True)),
                ('comments', models.BooleanField(default=True)),
                ('tree_updates', models.BooleanField(default=True)),
                ('security_alerts', models.BooleanField(default=True)),
                ('member_joins', models.BooleanField(default=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preferences', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='InAppNotification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notification_type', models.CharField(choices=[('UPLOAD', 'Upload'), ('COMMENT', 'Comment'), ('SECURITY', 'Security'), ('TREE', 'Tree'), ('MEMBER', 'Member'), ('SYSTEM', 'System')], max_length=20)),
                ('title', models.CharField(max_length=180)),
                ('message', models.TextField()),
                ('route', models.CharField(default='/', max_length=255)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='triggered_notifications', to=settings.AUTH_USER_MODEL)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='in_app_notifications', to=settings.AUTH_USER_MODEL)),
                ('vault', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='vaults.familyvault')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('endpoint', models.TextField(unique=True)),
                ('p256dh', models.CharField(max_length=512)),
                ('auth', models.CharField(max_length=512)),
                ('is_active', models.BooleanField(default=True)),
                ('user_agent', models.CharField(blank=True, max_length=512)),
                ('last_error', models.TextField(blank=True)),
                ('last_success_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name='inappnotification',
            index=models.Index(fields=['recipient', '-created_at'], name='notif_recipient_created_idx'),
        ),
        migrations.AddIndex(
            model_name='inappnotification',
            index=models.Index(fields=['recipient', 'is_read'], name='notif_recipient_read_idx'),
        ),
        migrations.AddIndex(
            model_name='pushsubscription',
            index=models.Index(fields=['user', 'is_active'], name='notif_push_user_active_idx'),
        ),
    ]
