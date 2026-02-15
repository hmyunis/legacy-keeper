import { AxiosError } from 'axios';

type ApiErrorShape = {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

const extractFirstObjectError = (payload: Record<string, unknown>): string | null => {
  for (const value of Object.values(payload)) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }
  return null;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (!data) {
      return fallback;
    }

    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    const objectMessage = extractFirstObjectError(data);
    if (objectMessage) {
      return objectMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
