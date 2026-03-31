export enum UserRole {
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER'
}

export type SubscriptionTier = 'BASIC' | 'HERITAGE' | 'DYNASTY';

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING'
}

export enum MediaStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum MediaExifStatus {
  NOT_STARTED = 'NOT_STARTED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  FAILED = 'FAILED',
}

export enum MediaFaceDetectionStatus {
  NOT_STARTED = 'NOT_STARTED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  FAILED = 'FAILED',
}

export enum MediaRestorationStatus {
  NOT_STARTED = 'NOT_STARTED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  FAILED = 'FAILED',
}

export enum MediaType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO'
}

export type MediaLockRule =
  | 'none'
  | 'time'
  | 'targeted'
  | 'time_and_target'
  | 'time_or_target';

export interface User {
  id: string;
  fullName: string;
  email: string;
  bio?: string;
  role: UserRole;
  profilePhoto?: string;
  subscriptionTier: SubscriptionTier;
  storageUsed: number;
}

export interface VaultSummary {
  id: string;
  name: string;
  familyName?: string;
  description?: string;
  safetyWindowMinutes?: number;
  storageQuality?: 'balanced' | 'high' | 'original';
  defaultVisibility?: 'private' | 'family';
  storageUsedBytes?: number;
  memberCount: number;
  myRole: UserRole | null;
  isOwner: boolean;
}

export interface VaultHealthItem {
  id: string;
  title: string;
  fileSize: number;
  createdAt: string;
  fileUrl?: string | null;
}

export interface VaultHealthGroup {
  hash: string;
  reclaimableBytes: number;
  duplicateCount: number;
  primary: VaultHealthItem;
  duplicates: VaultHealthItem[];
}

export interface VaultHealthReport {
  vaultId: string;
  generatedAt: string;
  totalItems: number;
  duplicateGroupsCount: number;
  duplicateItemsCount: number;
  reclaimableBytes: number;
  groups: VaultHealthGroup[];
}

export interface FamilyMember extends User {
  status: MemberStatus;
  joinedDate: string;
  lastActive?: string;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  id: string;
  fileId: string;
  personId?: string;
  name?: string;
  confidence: number;
  thumbnailUrl?: string;
  boundingBox: FaceBoundingBox;
}

export type MediaFileType = 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

export interface MediaFile {
  id: string;
  fileUrl: string;
  fileSize: number;
  mimeType?: string;
  fileType: MediaFileType;
  originalName: string;
  isPrimary: boolean;
  createdAt?: string;
}

export interface MediaLinkedRelative {
  id: string;
  fullName: string;
  photoUrl?: string;
}

export interface MediaItem {
  id: string;
  vaultId: string;
  uploaderId: string;
  uploaderName?: string;
  uploaderAvatar?: string;
  linkedRelatives?: MediaLinkedRelative[];
  isFavorite: boolean;
  type: MediaType;
  visibility: 'private' | 'family';
  lockRule?: MediaLockRule;
  lockReleaseAt?: string;
  lockTargetUserIds?: string[];
  lockTargetUsers?: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
  isTimeLocked?: boolean;
  title: string;
  description: string;
  dateTaken: string;
  uploadTimestamp: string;
  thumbnailUrl: string;
  tags: string[];
  status: MediaStatus;
  exifStatus: MediaExifStatus;
  exifError?: string;
  exifProcessedAt?: string;
  exifConfirmedAt?: string;
  faceDetectionStatus: MediaFaceDetectionStatus;
  faceDetectionError?: string;
  faceDetectionProcessedAt?: string;
  restorationStatus: MediaRestorationStatus;
  restorationError?: string;
  restorationProcessedAt?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  files: MediaFile[];
  detectedFaces?: DetectedFace[];
  fileUrl?: string;
}

export interface PersonProfile {
  id: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  deathDate?: string;
  birthPlace?: string;
  biography: string;
  photoUrl: string;
  isLinkedToUser: boolean;
}

export type RelationshipType = 'PARENT_OF' | 'ADOPTIVE_PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF';

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: RelationshipType;
}

export interface MediaTag {
  id: string;
  mediaId: string;
  personId: string;
  personName: string;
  faceCoordinates?: Record<string, number> | null;
  detectedFaceId?: string;
  taggedFileId?: string;
}

export interface MediaExifCandidate {
  fileId: string;
  originalName: string;
  isPrimary: boolean;
  dateTaken?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  extractedAt?: string;
}

export interface MediaExifWorkflowStatus {
  mediaId: string;
  status: MediaExifStatus;
  error?: string;
  taskId?: string;
  processedAt?: string;
  confirmedAt?: string;
  requiresConfirmation: boolean;
  candidate?: MediaExifCandidate;
  candidates?: MediaExifCandidate[];
  selectedFileId?: string;
  warnings?: string[];
}

export interface MediaFaceDetectionWorkflowStatus {
  mediaId: string;
  status: MediaFaceDetectionStatus;
  error?: string;
  taskId?: string;
  processedAt?: string;
  faceCount: number;
  faces: DetectedFace[];
  warnings?: string[];
}

export interface MediaRestorationResult {
  fileId: string;
  originalName: string;
  isPrimary: boolean;
  restoredPath?: string;
  restoredUrl?: string;
  processedAt?: string;
  taskId?: string;
  width?: number;
  height?: number;
  detectedBlackAndWhite?: boolean;
  requestedOptions?: {
    colorize: boolean;
    denoise: boolean;
  };
  appliedOptions?: {
    colorize: boolean;
    denoise: boolean;
  };
  warnings?: string[];
}

export interface MediaRestorationWorkflowStatus {
  mediaId: string;
  status: MediaRestorationStatus;
  error?: string;
  taskId?: string;
  processedAt?: string;
  selectedFileId?: string;
  requestedOptions?: {
    colorize: boolean;
    denoise: boolean;
  };
  result?: MediaRestorationResult;
  results: MediaRestorationResult[];
  warnings?: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
}

export interface PaginatedResponse<T> {
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

export type InAppNotificationType =
  | 'upload'
  | 'comment'
  | 'security'
  | 'tree'
  | 'member'
  | 'system';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: InAppNotificationType;
  isRead: boolean;
  createdAt: string;
  route: string;
  actorName?: string;
  vaultId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  newUploads: boolean;
  comments: boolean;
  treeUpdates: boolean;
  securityAlerts: boolean;
  memberJoins: boolean;
  pushAvailable: boolean;
}

export * from './api.types';
