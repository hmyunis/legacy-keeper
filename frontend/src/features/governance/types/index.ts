export interface VaultMember {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  role: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';
  joined_at: string;
}

export interface ActionLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string;
  };
  target_id?: string;
  target_type?: 'PERSON' | 'MEMORY' | 'SYSTEM';
}