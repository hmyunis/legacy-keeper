from rest_framework import exceptions, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from vaults.models import Membership

HELP_ARTICLES = [
    {
        "id": "upload",
        "category_key": "vault",
        "icon_key": "book_open",
        "allowed_roles": [Membership.Roles.ADMIN, Membership.Roles.CONTRIBUTOR],
        "order": 10,
    },
    {
        "id": "ai",
        "category_key": "vault",
        "icon_key": "sparkles",
        "allowed_roles": [Membership.Roles.ADMIN, Membership.Roles.CONTRIBUTOR],
        "order": 20,
    },
    {
        "id": "tree",
        "category_key": "lineage",
        "icon_key": "git_branch",
        "allowed_roles": [
            Membership.Roles.ADMIN,
            Membership.Roles.CONTRIBUTOR,
            Membership.Roles.VIEWER,
        ],
        "order": 30,
    },
    {
        "id": "invite",
        "category_key": "members",
        "icon_key": "users",
        "allowed_roles": [Membership.Roles.ADMIN],
        "order": 40,
    },
    {
        "id": "audit",
        "category_key": "security",
        "icon_key": "shield_check",
        "allowed_roles": [Membership.Roles.ADMIN],
        "order": 50,
    },
    {
        "id": "timeline",
        "category_key": "timeline",
        "icon_key": "clock",
        "allowed_roles": [
            Membership.Roles.ADMIN,
            Membership.Roles.CONTRIBUTOR,
            Membership.Roles.VIEWER,
        ],
        "order": 60,
    },
]


class HelpArticleListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_role(self, request):
        vault_id = (request.query_params.get("vault") or "").strip()
        if vault_id:
            membership = Membership.objects.filter(
                vault_id=vault_id,
                user=request.user,
                is_active=True,
            ).first()
            if not membership:
                raise exceptions.PermissionDenied("Not a member of this vault")
            return membership.role

        role_hint = (request.query_params.get("role") or "").strip().upper()
        valid_roles = dict(Membership.Roles.choices)
        if role_hint in valid_roles:
            return role_hint

        return None

    def get(self, request):
        resolved_role = self._resolve_role(request)
        articles = HELP_ARTICLES

        if resolved_role:
            articles = [
                article for article in HELP_ARTICLES if resolved_role in article["allowed_roles"]
            ]

        return Response(
            {
                "role": resolved_role,
                "articles": articles,
            }
        )
