import {
  Clock,
  Database,
  GitBranch,
  HelpCircle,
  History,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { UserRole } from '@/types';

export interface NavigationItem {
  name: string;
  icon: ReactNode;
  href: string;
  roles: readonly UserRole[];
}

const ALL_ROLES = [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] as const;

export const NAVIGATION: NavigationItem[] = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard', roles: ALL_ROLES },
  { name: 'Vault', icon: <Database size={20} />, href: '/vault', roles: ALL_ROLES },
  { name: 'Timeline', icon: <Clock size={20} />, href: '/timeline', roles: ALL_ROLES },
  { name: 'Family Tree', icon: <GitBranch size={20} />, href: '/tree', roles: ALL_ROLES },
  { name: 'Members', icon: <Users size={20} />, href: '/members', roles: [UserRole.ADMIN] },
  { name: 'Audit Logs', icon: <History size={20} />, href: '/logs', roles: [UserRole.ADMIN] },
  { name: 'Help Center', icon: <HelpCircle size={20} />, href: '/help', roles: ALL_ROLES },
  { name: 'Settings', icon: <Settings size={20} />, href: '/settings', roles: ALL_ROLES },
];
