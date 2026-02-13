import axiosClient from './axiosClient';
import { 
  MediaItem, 
  PersonProfile, 
  UserRole, 
  AuditLog,
  Relationship,
  FamilyMember
} from '../types';

/**
 * The API service layer provides a clean interface for all network requests.
 * By centralizing these calls, we can easily swap mock implementations for real ones.
 */
export const api = {
  // Media / Vault
  getMedia: () => axiosClient.get<MediaItem[]>('/media').then(r => r.data),
  deleteMedia: (id: string) => axiosClient.delete(`/media/${id}`).then(r => r.data),
  
  // People / Profiles
  getProfiles: () => axiosClient.get<PersonProfile[]>('/profiles').then(r => r.data),
  addProfile: (person: Omit<PersonProfile, 'id' | 'isLinkedToUser'>) => 
    axiosClient.post<PersonProfile>('/profiles', person).then(r => r.data),
  
  // Relationships
  getRelationships: () => axiosClient.get<Relationship[]>('/relationships').then(r => r.data),
  addRelationship: (rel: Omit<Relationship, 'id'>) => 
    axiosClient.post<Relationship>('/relationships', rel).then(r => r.data),
  
  // Admin / System
  getAuditLogs: () => axiosClient.get<AuditLog[]>('/audit-logs').then(r => r.data),
  getMembers: () => axiosClient.get<FamilyMember[]>('/members').then(r => r.data),
  inviteMember: (email: string, role: UserRole) => 
    axiosClient.post<FamilyMember>('/members/invite', { email, role }).then(r => r.data),
  removeMember: (id: string) => axiosClient.delete(`/members/${id}`).then(r => r.data)
};