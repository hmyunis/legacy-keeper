import type { FamilyMember, UserRole } from '@/types';
import type { ShareableInvite } from '@/services/membersApi';

export type MemberRoleFilter = UserRole | 'ALL';

export interface MembersStats {
  total: number;
  active: number;
  pending: number;
  contributors: number;
}

export type MembersConfirmState =
  | { kind: 'remove'; member: FamilyMember; title: string; message: string; confirmLabel: string }
  | { kind: 'role'; member: FamilyMember; role: UserRole; title: string; message: string; confirmLabel: string }
  | { kind: 'revokeLink'; link: ShareableInvite; title: string; message: string; confirmLabel: string }
  | { kind: 'deleteLink'; link: ShareableInvite; title: string; message: string; confirmLabel: string }
  | { kind: 'generateLink'; role: UserRole; expiresAt: Date; title: string; message: string; confirmLabel: string };
