import type { AuditLogCategory, AuditLogTimeframe } from './selectors';

export interface AuditLogsSearchState {
  category?: string;
  timeframe?: string;
}

export interface AuditFilterOption<TValue extends string> {
  id: TValue;
  label: string;
}

export interface AuditCategoryLabels {
  all: string;
  uploads: string;
  access: string;
  system: string;
  management: string;
}

export interface AuditTimeframeLabels {
  all: string;
  day: string;
  week: string;
  month: string;
}

export interface AuditLogFilterState {
  activeCategory: AuditLogCategory;
  activeTimeframe: AuditLogTimeframe;
}
