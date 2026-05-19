import type { AxiosResponse } from 'axios';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function extractData<T>(response: AxiosResponse): T {
  return response?.data as T;
}

export function extractList<T>(response: AxiosResponse | any): T[] {
  if (!response) return [];
  const data = response.data !== undefined ? response.data : response;

  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    if ('results' in data && Array.isArray(data.results)) {
      return data.results;
    }
  }

  return [];
}

export function extractPaginated<T>(response: AxiosResponse): PaginatedResponse<T> {
  const data = response.data;
  if (data && typeof data === 'object' && 'results' in data) {
    return data as PaginatedResponse<T>;
  }
  const results = Array.isArray(data) ? data : [];
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
}