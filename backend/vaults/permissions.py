from rest_framework import permissions
from .models import Membership

def _resolve_object_vault(obj):
    if obj is None:
        return None

    # Direct vault model instance
    if hasattr(obj, 'owner'):
        return obj

    # Common direct relation
    vault = getattr(obj, 'vault', None)
    if vault is not None:
        return vault

    # Genealogy Relationship/edge objects
    from_person = getattr(obj, 'from_person', None)
    if from_person is not None:
        from_person_vault = getattr(from_person, 'vault', None)
        if from_person_vault is not None:
            return from_person_vault

    # MediaTag and similar through media_item
    media_item = getattr(obj, 'media_item', None)
    if media_item is not None:
        media_vault = getattr(media_item, 'vault', None)
        if media_vault is not None:
            return media_vault

    return None

class IsVaultMember(permissions.BasePermission):
    """
    Allows access only to active members of vault.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        vault = _resolve_object_vault(obj)
        if not vault:
            return False

        return Membership.objects.filter(
            user=request.user, 
            vault=vault, 
            is_active=True
        ).exists()

class IsVaultAdmin(permissions.BasePermission):
    """
    Allows write access only to Vault Admins.
    """
    def has_object_permission(self, request, view, obj):
        vault = _resolve_object_vault(obj)
        if not vault: 
            return False

        return Membership.objects.filter(
            user=request.user, 
            vault=vault, 
            role=Membership.Roles.ADMIN,
            is_active=True
        ).exists()
