export interface Member {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';
  avatar: string;
}

export interface InvitePayload {
  name: string;
  email: string;
  role: string;
}

export interface PactPayload {
  email: string;
}