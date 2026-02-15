import { UserRole } from '@/types';

export type PermissionAction =
  | 'UPLOAD_MEDIA'
  | 'EDIT_MEDIA'
  | 'DELETE_MEDIA'
  | 'MANAGE_MEMBERS'
  | 'EDIT_TREE'
  | 'VIEW_LOGS';

const PERMISSIONS: Record<UserRole, readonly PermissionAction[]> = {
  [UserRole.ADMIN]: [
    'UPLOAD_MEDIA',
    'EDIT_MEDIA',
    'DELETE_MEDIA',
    'MANAGE_MEMBERS',
    'EDIT_TREE',
    'VIEW_LOGS',
  ],
  [UserRole.CONTRIBUTOR]: ['UPLOAD_MEDIA', 'EDIT_MEDIA'],
  [UserRole.VIEWER]: [],
};

export const hasPermission = (role: UserRole, action: PermissionAction) =>
  PERMISSIONS[role].includes(action);
