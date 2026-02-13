from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer
from vaults.permissions import IsVaultAdmin

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultAdmin]

    def get_queryset(self):
        """
        Filter logs by the vault ID passed in the query param.
        Example: /api/audit/?vault={uuid}
        """
        vault_pk = self.request.query_params.get('vault')
        if not vault_pk:
            return AuditLog.objects.none()
            
        return AuditLog.objects.filter(vault_id=vault_pk)
