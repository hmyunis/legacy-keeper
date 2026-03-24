export type DashboardRoute = '/vault' | '/members' | '/timeline' | '/tree' | '/logs';

export type DashboardStatIcon = 'memories' | 'members' | 'timeline';

export interface DashboardStat {
  label: string;
  value: string;
  to: '/vault' | '/members' | '/timeline';
  icon: DashboardStatIcon;
}

