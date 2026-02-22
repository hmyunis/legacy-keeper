import axiosClient from './axiosClient';
import type { 
  ApiPersonProfile, 
  ApiRelationship, 
  ApiTreeDataResponse,
  CreatePersonProfileRequest, 
  UpdatePersonProfileRequest,
  CreateRelationshipRequest,
  PaginatedApiResponse 
} from '../types/api.types';
import type { PersonProfile, Relationship } from '../types';
import { appEnv } from './env';

const PROFILES_ENDPOINT = 'genealogy/profiles/';
const RELATIONSHIPS_ENDPOINT = 'genealogy/relationships/';

const toAbsoluteUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value, appEnv.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

const mapApiProfileToPersonProfile = (profile: ApiPersonProfile): PersonProfile => ({
  id: String(profile.id),
  fullName: profile.fullName,
  gender: 'MALE', // Default since API doesn't provide this yet
  birthDate: profile.birthDate || '',
  deathDate: profile.deathDate || undefined,
  biography: profile.bio || '',
  photoUrl: toAbsoluteUrl(profile.photoUrl) || 'https://placehold.co/200x200?text=Profile',
  isLinkedToUser: Boolean(profile.linkedUser),
  birthPlace: String((profile as any).birthPlace ?? (profile as any).birth_place ?? '').trim(),
});

const mapApiRelationshipToRelationship = (rel: ApiRelationship): Relationship => ({
  id: String(rel.id),
  personAId: String(rel.fromPerson),
  personBId: String(rel.toPerson),
  type: rel.relationshipType,
});

const unwrapList = <T,>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export interface PaginatedProfilesResult {
  items: PersonProfile[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProfilesQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface TreeDataResult {
  profiles: PersonProfile[];
  relationships: Relationship[];
  vault: {
    id: string;
    name: string;
    familyName: string;
    memberCount: number;
  } | null;
}

export const genealogyApi = {
  // Profiles
  getProfiles: async (vaultId: string, params?: ProfilesQueryParams): Promise<PaginatedProfilesResult> => {
    const queryParams: Record<string, unknown> = { vault: vaultId };
    if (params?.page) queryParams.page = params.page;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.search) queryParams.search = params.search;

    const response = await axiosClient.get<PaginatedApiResponse<ApiPersonProfile>>(
      PROFILES_ENDPOINT,
      { params: queryParams }
    );
    
    const data = response.data;
    const items = (data.results || []).map(mapApiProfileToPersonProfile);
    
    return {
      items,
      totalCount: data.count || items.length,
      hasNextPage: !!data.next,
      hasPreviousPage: !!data.previous,
    };
  },

  getProfile: async (profileId: string): Promise<PersonProfile> => {
    const response = await axiosClient.get<ApiPersonProfile>(`${PROFILES_ENDPOINT}${profileId}/`);
    return mapApiProfileToPersonProfile(response.data);
  },

  createProfile: async (data: CreatePersonProfileRequest): Promise<PersonProfile> => {
    const formData = new FormData();
    formData.append('vault', data.vault);
    formData.append('fullName', data.fullName);
    if (data.birthDate) formData.append('birthDate', data.birthDate);
    if (data.birthPlace !== undefined) formData.append('birthPlace', data.birthPlace);
    if (data.deathDate) formData.append('deathDate', data.deathDate);
    if (data.bio) formData.append('bio', data.bio);
    if (data.profilePhoto) formData.append('profilePhoto', data.profilePhoto);

    const response = await axiosClient.post<ApiPersonProfile>(PROFILES_ENDPOINT, formData);
    return mapApiProfileToPersonProfile(response.data);
  },

  updateProfile: async (profileId: string, data: UpdatePersonProfileRequest): Promise<PersonProfile> => {
    const formData = new FormData();
    if (data.fullName) formData.append('fullName', data.fullName);
    if (data.birthDate !== undefined) formData.append('birthDate', data.birthDate || '');
    if (data.birthPlace !== undefined) formData.append('birthPlace', data.birthPlace);
    if (data.deathDate !== undefined) formData.append('deathDate', data.deathDate || '');
    if (data.bio !== undefined) formData.append('bio', data.bio);
    if (data.profilePhoto) formData.append('profilePhoto', data.profilePhoto);

    const response = await axiosClient.patch<ApiPersonProfile>(`${PROFILES_ENDPOINT}${profileId}/`, formData);
    return mapApiProfileToPersonProfile(response.data);
  },

  deleteProfile: async (profileId: string): Promise<void> => {
    await axiosClient.delete(`${PROFILES_ENDPOINT}${profileId}/`);
  },

  // Relationships
  getRelationships: async (vaultId: string): Promise<Relationship[]> => {
    const response = await axiosClient.get<ApiRelationship[] | PaginatedApiResponse<ApiRelationship>>(
      RELATIONSHIPS_ENDPOINT,
      { params: { vault: vaultId } }
    );
    return unwrapList(response.data).map(mapApiRelationshipToRelationship);
  },

  createRelationship: async (data: CreateRelationshipRequest): Promise<Relationship> => {
    const response = await axiosClient.post<ApiRelationship>(RELATIONSHIPS_ENDPOINT, data);
    return mapApiRelationshipToRelationship(response.data);
  },

  deleteRelationship: async (relationshipId: string): Promise<void> => {
    await axiosClient.delete(`${RELATIONSHIPS_ENDPOINT}${relationshipId}/`);
  },

  // Tree data
  getTreeData: async (vaultId: string): Promise<TreeDataResult> => {
    const response = await axiosClient.get<ApiTreeDataResponse>(`${PROFILES_ENDPOINT}tree/`, {
      params: { vault: vaultId },
    });
    const payload = response.data;

    return {
      profiles: (payload.nodes || []).map(mapApiProfileToPersonProfile),
      relationships: (payload.edges || []).map(mapApiRelationshipToRelationship),
      vault: payload.vault
        ? {
            id: String(payload.vault.id),
            name: payload.vault.name || '',
            familyName: payload.vault.familyName || '',
            memberCount: Number(payload.vault.memberCount || 0),
          }
        : null,
    };
  },
};

export type { ApiPersonProfile, ApiRelationship };
