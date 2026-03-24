import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { PaginatedAuditLogsResult } from '@/services/auditApi';
import {
  AUDIT_PAGE_SIZES,
  LOG_CATEGORIES,
  LOG_TIMEFRAMES,
  flattenAuditLogs,
  getAuditCategoryOptions,
  getAuditTimeframeOptions,
  resolveAuditCategory,
  resolveAuditTimeframe,
  withAuditCategorySearch,
  withAuditDefaultsSearch,
  withAuditTimeframeSearch,
} from './selectors';

describe('audit logs selectors', () => {
  it('resolves category and timeframe search values', () => {
    expect(resolveAuditCategory('Uploads')).toBe('Uploads');
    expect(resolveAuditCategory('invalid')).toBe('All');
    expect(resolveAuditTimeframe('WEEK')).toBe('WEEK');
    expect(resolveAuditTimeframe('invalid')).toBe('ALL');
  });

  it('flattens paginated audit logs', () => {
    const data: InfiniteData<PaginatedAuditLogsResult> = {
      pages: [
        {
          items: [
            {
              id: '1',
              timestamp: '2025-01-01 10:00',
              actorName: 'System',
              action: 'FILE_UPLOAD',
              target: 'media',
              details: '{}',
            },
          ],
          totalCount: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          items: [
            {
              id: '2',
              timestamp: '2025-01-02 10:00',
              actorName: 'Admin',
              action: 'MEMBER_UPDATE',
              target: 'membership',
              details: '{}',
            },
          ],
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      ],
      pageParams: [1, 2],
    };

    expect(flattenAuditLogs(data).map((item) => item.id)).toEqual(['1', '2']);
    expect(flattenAuditLogs(undefined)).toEqual([]);
  });

  it('updates URL search params for category and timeframe', () => {
    expect(withAuditCategorySearch({ q: 'john' }, 'Access')).toEqual({
      q: 'john',
      category: 'Access',
    });
    expect(withAuditTimeframeSearch({ q: 'john' }, 'MONTH')).toEqual({
      q: 'john',
      timeframe: 'MONTH',
    });
    expect(
      withAuditDefaultsSearch({
        previous: { q: 'john' },
        category: 'System',
        timeframe: 'DAY',
      }),
    ).toEqual({
      q: 'john',
      category: 'System',
      timeframe: 'DAY',
    });
  });

  it('builds category and timeframe filter options', () => {
    const categories = getAuditCategoryOptions({
      all: 'All',
      uploads: 'Uploads',
      access: 'Access',
      system: 'System',
      management: 'Management',
    });
    const timeframeOptions = getAuditTimeframeOptions({
      all: 'All Time',
      day: 'Last 24 Hours',
      week: 'Last 7 Days',
      month: 'Last 30 Days',
    });

    expect(categories.map((option) => option.id)).toEqual([...LOG_CATEGORIES]);
    expect(timeframeOptions.map((option) => option.id)).toEqual([...LOG_TIMEFRAMES]);
    expect(AUDIT_PAGE_SIZES).toEqual([10, 20, 50]);
  });
});
