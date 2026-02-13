import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Clock, 
  GitBranch, 
  Users, 
  History, 
  Settings, 
  HelpCircle
} from 'lucide-react';
import { UserRole } from './types';

export const PERMISSIONS = {
  [UserRole.ADMIN]: ['UPLOAD_MEDIA', 'EDIT_MEDIA', 'DELETE_MEDIA', 'MANAGE_MEMBERS', 'EDIT_TREE', 'VIEW_LOGS'],
  [UserRole.CONTRIBUTOR]: ['UPLOAD_MEDIA', 'EDIT_MEDIA'],
  [UserRole.VIEWER]: []
};

export const hasPermission = (role: UserRole, action: string) => {
  return (PERMISSIONS[role] || []).includes(action);
};

export const NAVIGATION = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '#/', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
  { name: 'Vault', icon: <Database size={20} />, href: '#/vault', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
  { name: 'Timeline', icon: <Clock size={20} />, href: '#/timeline', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
  { name: 'Family Tree', icon: <GitBranch size={20} />, href: '#/tree', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
  { name: 'Members', icon: <Users size={20} />, href: '#/members', roles: [UserRole.ADMIN] },
  { name: 'Audit Logs', icon: <History size={20} />, href: '#/logs', roles: [UserRole.ADMIN] },
  { name: 'Help Center', icon: <HelpCircle size={20} />, href: '#/help', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
  { name: 'Settings', icon: <Settings size={20} />, href: '#/settings', roles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] },
];

export const MOCK_USER = {
  id: 'user-1',
  fullName: 'Abebe Tadesse',
  email: 'abebe.t@legacy.et',
  role: UserRole.ADMIN,
  profilePhoto: 'https://picsum.photos/seed/abebe/100/100'
};