import axiosClient from './axiosClient';
import type { ApiAuditLog, PaginatedApiResponse } from '../types/api.types';
import type { AuditLog } from '../types';

const AUDIT_ENDPOINT = 'audit/logs/';

const toAuditTimestamp = (isoValue: string): string => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const mapApiAuditLogToAuditLog = (log: ApiAuditLog): AuditLog => ({
  id: String(log.id),
  timestamp: toAuditTimestamp(log.timestamp),
  actorName: log.actorName || 'System',
  action: log.action,
  target: log.targetType || 'resource',
  details: typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes || {}),
});

const unwrapList = <T,>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export interface PaginatedAuditLogsResult {
  items: AuditLog[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuditLogsQueryParams {
  page?: number;
  pageSize?: number;
  category?: 'All' | 'Uploads' | 'Access' | 'System' | 'Management';
  timeframe?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH';
  search?: string;
  action?: string;
  actor?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditApi = {
  getAuditLogs: async (vaultId: string, params?: AuditLogsQueryParams): Promise<PaginatedAuditLogsResult> => {
    const queryParams: Record<string, unknown> = { vault: vaultId };
    if (params?.page) queryParams.page = params.page;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.category && params.category !== 'All') queryParams.category = params.category;
    if (params?.timeframe && params.timeframe !== 'ALL') queryParams.timeframe = params.timeframe;
    if (params?.search) queryParams.q = params.search;
    if (params?.action) queryParams.action = params.action;
    if (params?.actor) queryParams.actor = params.actor;
    if (params?.dateFrom) queryParams.timestampAfter = params.dateFrom;
    if (params?.dateTo) queryParams.timestampBefore = params.dateTo;

    const response = await axiosClient.get<PaginatedApiResponse<ApiAuditLog>>(
      AUDIT_ENDPOINT,
      { params: queryParams }
    );
    
    const data = response.data;
    const items = (data.results || []).map(mapApiAuditLogToAuditLog);
    
    return {
      items,
      totalCount: data.count || items.length,
      hasNextPage: !!data.next,
      hasPreviousPage: !!data.previous,
    };
  },

  exportAuditLogs: async (vaultId: string, params?: Omit<AuditLogsQueryParams, 'page' | 'pageSize'>) => {
    const queryParams: Record<string, unknown> = { vault: vaultId };
    if (params?.category && params.category !== 'All') queryParams.category = params.category;
    if (params?.timeframe && params.timeframe !== 'ALL') queryParams.timeframe = params.timeframe;
    if (params?.search) queryParams.q = params.search;
    if (params?.action) queryParams.action = params.action;
    if (params?.actor) queryParams.actor = params.actor;
    if (params?.dateFrom) queryParams.timestampAfter = params.dateFrom;
    if (params?.dateTo) queryParams.timestampBefore = params.dateTo;

    const response = await axiosClient.get<Blob>(`${AUDIT_ENDPOINT}export/`, {
      params: queryParams,
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'];
    const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
    const fileName = fileNameMatch?.[1] || `audit-log-${vaultId}.xlsx`;

    return { blob: response.data, fileName };
  },
};

export type { ApiAuditLog };
