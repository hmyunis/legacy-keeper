import axiosClient from './axiosClient';
import type { 
  ApiMembership, 
  ApiMediaTag,
  CreateMediaTagRequest,
  InviteMemberRequest,
  JoinVaultRequest,
  UpdateMemberRoleRequest,
  TransferOwnershipRequest,
  PaginatedApiResponse 
} from '../types/api.types';
import type { FamilyMember, MediaTag, UserRole, MemberStatus } from '../types';
import { appEnv } from './env';

const MEMBERS_ENDPOINT = 'members/';
const INVITE_ENDPOINT = 'invite/';
const JOIN_ENDPOINT = 'join/';
const LEAVE_ENDPOINT = 'leave/';
const TRANSFER_OWNERSHIP_ENDPOINT = 'transfer-ownership/';
const TAGS_ENDPOINT = 'genealogy/tags/';

const fallbackAvatar = (fullName: string, email: string): string => {
  const label = encodeURIComponent(fullName || email || 'LegacyKeeper');
  return `https://ui-avatars.com/api/?name=${label}&background=E2E8F0&color=334155`;
};

const toAbsoluteUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value, appEnv.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

const mapApiMemberToFamilyMember = (member: ApiMembership): FamilyMember => ({
  id: String(member.id),
  fullName: member.user.fullName,
  email: member.user.email,
  role: member.role,
  profilePhoto: toAbsoluteUrl(member.user.avatar) || fallbackAvatar(member.user.fullName, member.user.email),
  status: member.isActive ? MemberStatus.ACTIVE : MemberStatus.PENDING,
  joinedDate: member.createdAt,
  subscriptionTier: 'BASIC',
  storageUsed: 0,
});

const mapApiTagToMediaTag = (tag: ApiMediaTag): MediaTag => ({
  id: String(tag.id),
  mediaId: String(tag.mediaItem),
  personId: String(tag.person),
  personName: tag.personName,
  faceCoordinates: tag.faceCoordinates || null,
});

const unwrapList = <T,>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export interface PaginatedMembersResult {
  items: FamilyMember[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface MembersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: MemberStatus;
}

export interface InviteMemberResponse {
  message: string;
  link?: string;
  token?: string;
}

export interface JoinVaultResponse {
  message: string;
  vaultId?: string;
  vaultName?: string;
  role?: UserRole;
  alreadyMember?: boolean;
}

export interface LeaveVaultResponse {
  message: string;
}

export interface TransferOwnershipResponse {
  message: string;
  ownerId?: string;
}

export const membersApi = {
  // Members
  getMembers: async (vaultId: string, params?: MembersQueryParams): Promise<PaginatedMembersResult> => {
    const queryParams: Record<string, unknown> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.search) queryParams.search = params.search;
    if (params?.role) queryParams.role = params.role;
    if (params?.status) queryParams.isActive = params.status === MemberStatus.ACTIVE;

    const response = await axiosClient.get<PaginatedApiResponse<ApiMembership>>(
      `vaults/${vaultId}/${MEMBERS_ENDPOINT}`,
      { params: queryParams }
    );
    
    const data = response.data;
    const rows = unwrapList(data);
    const items = rows.map(mapApiMemberToFamilyMember);
    
    return {
      items,
      totalCount: Array.isArray(data) ? items.length : (data.count || items.length),
      hasNextPage: Array.isArray(data) ? false : !!data.next,
      hasPreviousPage: Array.isArray(data) ? false : !!data.previous,
    };
  },

  removeMember: async (vaultId: string, membershipId: string): Promise<void> => {
    await axiosClient.delete(`vaults/${vaultId}/${MEMBERS_ENDPOINT}${membershipId}/`);
  },

  updateMemberRole: async (
    vaultId: string,
    membershipId: string,
    data: UpdateMemberRoleRequest
  ): Promise<FamilyMember> => {
    const response = await axiosClient.patch<ApiMembership>(
      `vaults/${vaultId}/${MEMBERS_ENDPOINT}${membershipId}/`,
      data
    );
    return mapApiMemberToFamilyMember(response.data);
  },

  inviteMember: async (vaultId: string, data: InviteMemberRequest): Promise<InviteMemberResponse> => {
    const response = await axiosClient.post<InviteMemberResponse>(
      `vaults/${vaultId}/${INVITE_ENDPOINT}`,
      data
    );
    return response.data;
  },

  joinVault: async (data: JoinVaultRequest): Promise<JoinVaultResponse> => {
    const response = await axiosClient.post<JoinVaultResponse>(JOIN_ENDPOINT, data);
    return response.data;
  },

  leaveVault: async (vaultId: string): Promise<LeaveVaultResponse> => {
    const response = await axiosClient.post<LeaveVaultResponse>(`vaults/${vaultId}/${LEAVE_ENDPOINT}`);
    return response.data;
  },

  transferOwnership: async (
    vaultId: string, 
    data: TransferOwnershipRequest
  ): Promise<TransferOwnershipResponse> => {
    const response = await axiosClient.post<TransferOwnershipResponse>(
      `vaults/${vaultId}/${TRANSFER_OWNERSHIP_ENDPOINT}`,
      data
    );
    return response.data;
  },
};

export const mediaTagsApi = {
  getTags: async (mediaId: string): Promise<MediaTag[]> => {
    const response = await axiosClient.get<ApiMediaTag[] | PaginatedApiResponse<ApiMediaTag>>(
      TAGS_ENDPOINT,
      { params: { media: mediaId } }
    );
    return unwrapList(response.data).map(mapApiTagToMediaTag);
  },

  createTag: async (data: CreateMediaTagRequest): Promise<MediaTag> => {
    const response = await axiosClient.post<ApiMediaTag>(TAGS_ENDPOINT, data);
    return mapApiTagToMediaTag(response.data);
  },

  deleteTag: async (tagId: string): Promise<void> => {
    await axiosClient.delete(`${TAGS_ENDPOINT}${tagId}/`);
  },
};

export type { ApiMembership, ApiMediaTag };
