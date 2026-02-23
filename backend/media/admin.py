from django.contrib import admin
from .models import MediaAttachment, MediaFavorite, MediaItem

@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'vault', 'uploader', 'media_type', 'created_at')
    search_fields = ('title', 'description', 'uploader__email', 'uploader__full_name')
    list_filter = ('media_type', 'ai_status', 'created_at')


@admin.register(MediaFavorite)
class MediaFavoriteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'media_item', 'created_at')
    search_fields = ('user__email', 'user__full_name', 'media_item__title')


@admin.register(MediaAttachment)
class MediaAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'media_item', 'file_type', 'mime_type', 'file_size', 'created_at')
    search_fields = ('media_item__title', 'original_name')
    list_filter = ('file_type', 'created_at')
