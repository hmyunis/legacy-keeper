import type { Member, InvitePayload, PactPayload } from '../types';

const MOCK_MEMBERS: Member[] = [
  { id: 1, name: 'Abebe Kebede', email: 'abebe@family.com', role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff' },
  { id: 2, name: 'Fatima Haile', email: 'fatima@family.com', role: 'CONTRIBUTOR', avatar: 'https://ui-avatars.com/api/?name=Fatima&background=DBCFB5&color=2A2522' },
  { id: 3, name: 'Yohannes Abebe', email: 'yohannes@family.com', role: 'VIEWER', avatar: 'https://ui-avatars.com/api/?name=Yohannes&background=3A5F7A&color=fff' },
];

export const governanceService = {
  getMembers: async (): Promise<Member[]> => {
    return MOCK_MEMBERS;
  },
  inviteMember: async (payload: InvitePayload): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 1200));
  },
  requestPact: async (payload: PactPayload): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 1500));
  },
  removeMember: async (name: string): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
};