import axiosClient from './axiosClient';
import MockAdapter from 'axios-mock-adapter';
import { 
  MediaItem, 
  PersonProfile, 
  UserRole, 
  AuditLog,
  Relationship,
  FamilyMember
} from '../types';
import { 
  INITIAL_MEDIA, 
  INITIAL_PROFILES, 
  INITIAL_RELATIONSHIPS, 
  INITIAL_MEMBERS 
} from './mockData';

// Initialize the mock adapter on the singleton instance
const mock = new MockAdapter(axiosClient, { delayResponse: 800 });

// State persistence
let media = [...INITIAL_MEDIA];
let members = [...INITIAL_MEMBERS];
let relationships = [...INITIAL_RELATIONSHIPS];
let profiles = [...INITIAL_PROFILES];

// Mock Route Handlers
mock.onGet('/media').reply(200, media);
mock.onDelete(/\/media\/\w+/).reply(config => {
  const id = config.url?.split('/').pop();
  media = media.filter(m => m.id !== id);
  return [200];
});

mock.onGet('/profiles').reply(200, profiles);
mock.onPost('/profiles').reply(config => {
  const person = JSON.parse(config.data);
  const newPerson = { ...person, id: `p${Date.now()}`, isLinkedToUser: false };
  profiles.push(newPerson);
  return [200, newPerson];
});

mock.onGet('/relationships').reply(200, relationships);
mock.onPost('/relationships').reply(config => {
  const rel = JSON.parse(config.data);
  const newRel = { ...rel, id: `r${Date.now()}` };
  relationships.push(newRel);
  return [200, newRel];
});

mock.onGet('/audit-logs').reply(200, [
  { id: 'l1', timestamp: '2024-01-26 14:32', actorName: 'James H.', action: 'INVITE_GEN', target: 'moti.l@email.com', details: 'Contributor invite generated.' },
  { id: 'l2', timestamp: '2024-01-26 12:10', actorName: 'System', action: 'FACE_DETECT', target: 'Media m1', details: 'Auto-detected 1 face.' }
]);

mock.onGet('/members').reply(200, members);
mock.onPost('/members/invite').reply(config => {
  const { email, role } = JSON.parse(config.data);
  // Add missing properties required by FamilyMember/User interface
  const newMember: FamilyMember = {
    id: `u${Date.now()}`,
    fullName: email.split('@')[0],
    email,
    role,
    status: 1 as any, // PENDING
    joinedDate: new Date().toISOString().split('T')[0],
    profilePhoto: `https://picsum.photos/seed/${email}/100/100`,
    subscriptionTier: 'BASIC',
    storageUsed: 0
  };
  members.push(newMember);
  return [200, newMember];
});

mock.onDelete(/\/members\/\w+/).reply(config => {
  const id = config.url?.split('/').pop();
  members = members.filter(m => m.id !== id);
  return [200];
});

// Exposed API methods using the Axios singleton
export const mockApi = {
  getMedia: () => axiosClient.get<MediaItem[]>('/media').then(r => r.data),
  deleteMedia: (id: string) => axiosClient.delete(`/media/${id}`).then(r => r.data),
  getProfiles: () => axiosClient.get<PersonProfile[]>('/profiles').then(r => r.data),
  addProfile: (person: Omit<PersonProfile, 'id' | 'isLinkedToUser'>) => axiosClient.post('/profiles', person).then(r => r.data),
  getRelationships: () => axiosClient.get<Relationship[]>('/relationships').then(r => r.data),
  addRelationship: (rel: Omit<Relationship, 'id'>) => axiosClient.post('/relationships', rel).then(r => r.data),
  getAuditLogs: () => axiosClient.get<AuditLog[]>('/audit-logs').then(r => r.data),
  getMembers: () => axiosClient.get<FamilyMember[]>('/members').then(r => r.data),
  inviteMember: (email: string, role: UserRole) => axiosClient.post('/members/invite', { email, role }).then(r => r.data),
  removeMember: (id: string) => axiosClient.delete(`/members/${id}`).then(r => r.data)
};