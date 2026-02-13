from rest_framework import permissions
from .models import Membership

class IsVaultMember(permissions.BasePermission):
    """
    Allows access only to active members of vault.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        # Handle cases where obj is Vault, or obj has .vault attribute
        vault = obj if hasattr(obj, 'owner') else getattr(obj, 'vault', None)
        
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
        vault = obj if hasattr(obj, 'owner') else getattr(obj, 'vault', None)
        if not vault: 
            return False

        return Membership.objects.filter(
            user=request.user, 
            vault=vault, 
            role=Membership.Roles.ADMIN,
            is_active=True
        ).exists()
