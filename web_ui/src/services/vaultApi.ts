import axiosClient from './axiosClient';
import type {
  ApiVault,
  ApiVaultCleanupResult,
  ApiVaultHealthReport,
  CreateVaultRequest,
  PaginatedApiResponse,
  UpdateVaultRequest,
} from '../types/api.types';
import type { VaultHealthReport, VaultSummary } from '../types';

const VAULTS_ENDPOINT = 'vaults/';

const buildVaultFormData = (data: CreateVaultRequest | UpdateVaultRequest): FormData => {
  const formData = new FormData();

  if (Object.prototype.hasOwnProperty.call(data, 'name') && data.name !== undefined) {
    formData.append('name', data.name);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'description') && data.description !== undefined) {
    formData.append('description', data.description);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'familyName') && data.familyName !== undefined) {
    formData.append('familyName', data.familyName);
  }

  if (
    Object.prototype.hasOwnProperty.call(data, 'safetyWindowMinutes') &&
    data.safetyWindowMinutes !== undefined
  ) {
    formData.append('safetyWindowMinutes', String(data.safetyWindowMinutes));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'storageQuality') && data.storageQuality !== undefined) {
    formData.append('storageQuality', data.storageQuality);
  }

  if (
    Object.prototype.hasOwnProperty.call(data, 'defaultVisibility') &&
    data.defaultVisibility !== undefined
  ) {
    formData.append('defaultVisibility', data.defaultVisibility);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'coverPhoto') && data.coverPhoto !== undefined) {
    if (data.coverPhoto instanceof File) {
      formData.append('coverPhoto', data.coverPhoto);
    } else if (typeof data.coverPhoto === 'string' && data.coverPhoto.trim()) {
      formData.append('coverPhoto', data.coverPhoto.trim());
    }
  }

  return formData;
};

const mapApiVaultToVaultSummary = (vault: ApiVault): VaultSummary => ({
  id: String(vault.id),
  name: vault.name,
  familyName: vault.familyName || '',
  description: vault.description || '',
  safetyWindowMinutes: Number(vault.safetyWindowMinutes ?? 60),
  storageQuality: vault.storageQuality
    ? vault.storageQuality.toLowerCase() as VaultSummary['storageQuality']
    : 'high',
  defaultVisibility: vault.defaultVisibility
    ? vault.defaultVisibility.toLowerCase() as VaultSummary['defaultVisibility']
    : 'family',
  storageUsedBytes: Number(vault.storageUsedBytes || 0),
  memberCount: vault.memberCount ?? 0,
  myRole: vault.myRole ?? null,
  isOwner: Boolean(vault.isOwner),
});

const mapHealthReport = (report: ApiVaultHealthReport): VaultHealthReport => ({
  vaultId: report.vaultId,
  generatedAt: report.generatedAt,
  totalItems: report.totalItems,
  duplicateGroupsCount: report.duplicateGroupsCount,
  duplicateItemsCount: report.duplicateItemsCount,
  reclaimableBytes: report.reclaimableBytes,
  groups: report.groups.map((group) => ({
    hash: group.hash,
    reclaimableBytes: group.reclaimableBytes,
    duplicateCount: group.duplicateCount,
    primary: {
      id: group.primary.id,
      title: group.primary.title,
      fileSize: group.primary.fileSize,
      createdAt: group.primary.createdAt,
      fileUrl: group.primary.fileUrl || null,
    },
    duplicates: group.duplicates.map((item) => ({
      id: item.id,
      title: item.title,
      fileSize: item.fileSize,
      createdAt: item.createdAt,
      fileUrl: item.fileUrl || null,
    })),
  })),
});

const unwrapList = <T,>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};

export const vaultApi = {
  getVaults: async (): Promise<VaultSummary[]> => {
    const response = await axiosClient.get<ApiVault[] | PaginatedApiResponse<ApiVault>>(VAULTS_ENDPOINT);
    return unwrapList(response.data).map(mapApiVaultToVaultSummary);
  },

  getVault: async (vaultId: string): Promise<VaultSummary> => {
    const response = await axiosClient.get<ApiVault>(`${VAULTS_ENDPOINT}${vaultId}/`);
    return mapApiVaultToVaultSummary(response.data);
  },

  createVault: async (data: CreateVaultRequest): Promise<VaultSummary> => {
    const response = await axiosClient.post<ApiVault>(VAULTS_ENDPOINT, buildVaultFormData(data));
    return mapApiVaultToVaultSummary(response.data);
  },

  updateVault: async (vaultId: string, data: UpdateVaultRequest): Promise<VaultSummary> => {
    const response = await axiosClient.patch<ApiVault>(
      `${VAULTS_ENDPOINT}${vaultId}/`,
      buildVaultFormData(data)
    );
    return mapApiVaultToVaultSummary(response.data);
  },

  getVaultHealthAnalysis: async (vaultId: string): Promise<VaultHealthReport> => {
    const response = await axiosClient.get<ApiVaultHealthReport>(`${VAULTS_ENDPOINT}${vaultId}/health-analysis/`);
    return mapHealthReport(response.data);
  },

  cleanupVaultRedundant: async (
    vaultId: string,
    payload?: { groupHashes?: string[]; dryRun?: boolean }
  ): Promise<ApiVaultCleanupResult> => {
    const response = await axiosClient.post<ApiVaultCleanupResult>(
      `${VAULTS_ENDPOINT}${vaultId}/cleanup-redundant/`,
      payload || {}
    );
    return response.data;
  },
};

export type { ApiVault };
