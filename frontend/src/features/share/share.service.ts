import axiosClient from '../../services/axiosClient';

export type ShareItemType = 'MEMORY' | 'PERSON';
export type ShareAudience = 'PUBLIC' | 'AUTHENTICATED';
export type ShareVaultScope = 'SAME_VAULT' | 'LINEAGE_PACT' | 'ANY_VAULT';

export interface CreateSharePayload {
  itemType: ShareItemType;
  itemId: string;
  vaultId: string;
  audience: ShareAudience;
  vaultScope: ShareVaultScope;
}

export interface SharedArtifactLink {
  id: string;
  token: string;
  item_type: ShareItemType;
  object_id: string;
  audience: ShareAudience;
  vault_scope: ShareVaultScope;
  vaultId: string;
  vaultName: string;
}

export async function createShareLink(payload: CreateSharePayload) {
  const response = await axiosClient.post<SharedArtifactLink>('/shares/', payload);
  return response.data;
}

export async function resolveShareLink(token: string) {
  const response = await axiosClient.get(`/shares/${token}/`);
  return response.data;
}
