import { UserRole, MemberStatus, MediaStatus, MediaType, RelationshipType } from '../types';

export interface PaginatedApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiUserShort {
  id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
}

export interface ApiMembership {
  id: string;
  user: ApiUserShort;
  role: UserRole;
  createdAt: string;
  isActive: boolean;
}

export interface ApiVault {
  id: string;
  name: string;
  familyName?: string;
  description?: string;
  safetyWindowMinutes?: number;
  storageQuality?: 'BALANCED' | 'HIGH' | 'ORIGINAL';
  defaultVisibility?: 'PRIVATE' | 'FAMILY';
  storageUsedBytes?: number;
  memberCount?: number;
  myRole?: UserRole | null;
  isOwner?: boolean;
}

export interface ApiVaultHealthItem {
  id: string;
  title: string;
  fileSize: number;
  createdAt: string;
  fileUrl?: string | null;
}

export interface ApiVaultHealthGroup {
  hash: string;
  reclaimableBytes: number;
  duplicateCount: number;
  primary: ApiVaultHealthItem;
  duplicates: ApiVaultHealthItem[];
}

export interface ApiVaultHealthReport {
  vaultId: string;
  generatedAt: string;
  totalItems: number;
  duplicateGroupsCount: number;
  duplicateItemsCount: number;
  reclaimableBytes: number;
  groups: ApiVaultHealthGroup[];
}

export interface ApiVaultCleanupResult {
  dryRun: boolean;
  groupsSelected?: number;
  groupsProcessed?: number;
  duplicateItemsCount?: number;
  deletedItemsCount?: number;
  reclaimableBytes?: number;
  recoveredBytes?: number;
  remainingDuplicateGroups?: number;
  message?: string;
  groups?: ApiVaultHealthGroup[];
}

export interface ApiMediaItem {
  id: string;
  vault: string;
  uploader?: string | null;
  uploaderName?: string | null;
  uploaderAvatar?: string | null;
  linkedRelatives?: ApiLinkedRelative[] | null;
  isFavorite?: boolean;
  mediaType: MediaType;
  visibility?: 'PRIVATE' | 'FAMILY';
  title?: string;
  description?: string;
  dateTaken?: string | null;
  createdAt: string;
  fileUrl?: string | null;
  aiStatus?: string;
  metadata?: Record<string, unknown> | null;
  files?: ApiMediaFile[];
}

export interface ApiLinkedRelative {
  id: string;
  fullName?: string | null;
  photoUrl?: string | null;
}

export interface ApiMediaFile {
  id: string;
  fileUrl?: string | null;
  fileSize?: number;
  mimeType?: string;
  fileType?: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  originalName?: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface ApiFacetOption {
  value: string;
  count: number;
}

export interface ApiMediaFilterSummary {
  totalCount?: number;
  people?: ApiFacetOption[];
  tags?: ApiFacetOption[];
  locations?: ApiFacetOption[];
  eras?: ApiFacetOption[];
  types?: ApiFacetOption[];
  dateRange?: {
    start?: string | null;
    end?: string | null;
  };
}

export interface ApiPersonProfile {
  id: string;
  vault: string;
  fullName: string;
  maidenName?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  isDeceased?: boolean;
  bio?: string;
  profilePhoto?: string | null;
  photoUrl?: string | null;
  linkedUser?: string | null;
}

export interface ApiRelationship {
  id: string;
  fromPerson: string;
  toPerson: string;
  relationshipType: RelationshipType;
  fromPersonName?: string;
  toPersonName?: string;
}

export interface ApiTreeDataResponse {
  nodes: ApiPersonProfile[];
  edges: ApiRelationship[];
  vault?: {
    id: string;
    name: string;
    familyName?: string;
    memberCount?: number;
  };
}

export interface ApiMediaTag {
  id: string;
  mediaItem: string;
  person: string;
  personName: string;
  faceCoordinates?: Record<string, number> | null;
  createdBy?: string;
}

export interface ApiAuditLog {
  id: string;
  timestamp: string;
  actorName?: string | null;
  action: string;
  targetType?: string;
  changes?: Record<string, unknown> | string | null;
}

export interface ApiHelpArticleMeta {
  id: string;
  categoryKey: string;
  iconKey: string;
  allowedRoles: UserRole[];
  order: number;
}

export interface ApiInAppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  notificationType: string;
  isRead: boolean;
  route: string;
  metadata?: Record<string, unknown>;
  vaultId?: string | null;
  actorName?: string;
  createdAt: string;
}

export interface ApiNotificationsResponse {
  items: ApiInAppNotification[];
  unreadCount: number;
  serverTime: string;
}

export interface ApiNotificationPreferences {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  newUploads: boolean;
  comments: boolean;
  treeUpdates: boolean;
  securityAlerts: boolean;
  memberJoins: boolean;
  pushAvailable: boolean;
}

export interface ApiPushPublicKeyResponse {
  publicKey: string | null;
  isAvailable: boolean;
}

export interface ApiInvite {
  id: string;
  vault: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  createdBy?: string;
}

export interface CreateVaultRequest {
  name: string;
  familyName?: string;
  description?: string;
  coverPhoto?: File;
  safetyWindowMinutes?: number;
  storageQuality?: 'BALANCED' | 'HIGH' | 'ORIGINAL';
  defaultVisibility?: 'PRIVATE' | 'FAMILY';
}

export interface UpdateVaultRequest {
  name?: string;
  familyName?: string;
  description?: string;
  coverPhoto?: File | string;
  safetyWindowMinutes?: number;
  storageQuality?: 'BALANCED' | 'HIGH' | 'ORIGINAL';
  defaultVisibility?: 'PRIVATE' | 'FAMILY';
}

export interface CreateMediaRequest {
  vault: string;
  file: File;
  title: string;
  description?: string;
  dateTaken?: string;
  mediaType: MediaType;
  visibility?: 'PRIVATE' | 'FAMILY';
  metadata?: {
    location?: string;
    tags?: string[];
  };
}

export interface UpdateMediaRequest {
  title?: string;
  description?: string;
  dateTaken?: string;
  visibility?: 'PRIVATE' | 'FAMILY';
  metadata?: {
    location?: string;
    tags?: string[];
  };
}

export interface CreatePersonProfileRequest {
  vault: string;
  fullName: string;
  birthDate?: string | null;
  birthPlace?: string;
  deathDate?: string | null;
  bio?: string;
  profilePhoto?: File;
}

export interface UpdatePersonProfileRequest {
  fullName?: string;
  birthDate?: string | null;
  birthPlace?: string;
  deathDate?: string | null;
  bio?: string;
  profilePhoto?: File;
}

export interface CreateRelationshipRequest {
  fromPerson: string;
  toPerson: string;
  relationshipType: RelationshipType;
}

export interface CreateMediaTagRequest {
  mediaItem: string;
  person: string;
  faceCoordinates?: Record<string, number> | null;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

export interface JoinVaultRequest {
  token: string;
}

export interface TransferOwnershipRequest {
  membershipId: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatar?: File;
}
