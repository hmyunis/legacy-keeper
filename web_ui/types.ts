
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
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum MediaType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  profilePhoto?: string;
  subscriptionTier: SubscriptionTier;
  storageUsed: number; // in GB
}

export interface FamilyMember extends User {
  status: MemberStatus;
  joinedDate: string;
  lastActive?: string;
}

export interface DetectedFace {
  id: string;
  personId?: string;
  name?: string;
  confidence: number;
  thumbnailUrl: string;
}

export interface MediaItem {
  id: string;
  vaultId: string;
  uploaderId: string;
  type: MediaType;
  title: string;
  description: string;
  dateTaken: string;
  uploadTimestamp: string;
  thumbnailUrl: string;
  tags: string[];
  status: MediaStatus;
  location?: string;
  detectedFaces?: DetectedFace[];
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

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
}
