import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedAuditLogsResult } from '@/services/auditApi';
import type { AuditLog } from '@/types';
import type {
  AuditCategoryLabels,
  AuditFilterOption,
  AuditTimeframeLabels,
} from './types';

export const LOG_CATEGORIES = ['All', 'Uploads', 'Access', 'System', 'Management'] as const;
export const LOG_TIMEFRAMES = ['ALL', 'DAY', 'WEEK', 'MONTH'] as const;
export const AUDIT_PAGE_SIZES = [10, 20, 50] as const;

export type AuditLogCategory = (typeof LOG_CATEGORIES)[number];
export type AuditLogTimeframe = (typeof LOG_TIMEFRAMES)[number];

export const resolveAuditCategory = (value: unknown): AuditLogCategory =>
  LOG_CATEGORIES.includes(value as AuditLogCategory) ? (value as AuditLogCategory) : 'All';

export const resolveAuditTimeframe = (value: unknown): AuditLogTimeframe =>
  LOG_TIMEFRAMES.includes(value as AuditLogTimeframe) ? (value as AuditLogTimeframe) : 'ALL';

export const flattenAuditLogs = (logsData?: InfiniteData<PaginatedAuditLogsResult>): AuditLog[] => {
  if (!logsData?.pages?.length) return [];
  return logsData.pages.flatMap((page) => page.items || []);
};

export const withAuditCategorySearch = (
  previous: Record<string, unknown>,
  category: AuditLogCategory,
): Record<string, unknown> => ({ ...previous, category });

export const withAuditTimeframeSearch = (
  previous: Record<string, unknown>,
  timeframe: AuditLogTimeframe,
): Record<string, unknown> => ({ ...previous, timeframe });

export const withAuditDefaultsSearch = (params: {
  previous: Record<string, unknown>;
  category: AuditLogCategory;
  timeframe: AuditLogTimeframe;
}): Record<string, unknown> => {
  const { previous, category, timeframe } = params;
  return { ...previous, category, timeframe };
};

export const getAuditCategoryOptions = (
  labels: AuditCategoryLabels,
): AuditFilterOption<AuditLogCategory>[] => [
  { id: 'All', label: labels.all },
  { id: 'Uploads', label: labels.uploads },
  { id: 'Access', label: labels.access },
  { id: 'System', label: labels.system },
  { id: 'Management', label: labels.management },
];

export const getAuditTimeframeOptions = (
  labels: AuditTimeframeLabels,
): AuditFilterOption<AuditLogTimeframe>[] => [
  { id: 'ALL', label: labels.all },
  { id: 'DAY', label: labels.day },
  { id: 'WEEK', label: labels.week },
  { id: 'MONTH', label: labels.month },
];
