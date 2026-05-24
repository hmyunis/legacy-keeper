export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface VaultMembershipSummary {
  id: string;
  name: string;
  role: string;
  joinedAt?: string;
}

export interface VaultInvitationSummary {
  id: string;
  vaultId: string;
  vaultName: string;
  role: string;
  status: string;
  invitedByName?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    is_verified?: boolean;
    vaultId?: string;
    avatar?: string;
    vaults?: VaultMembershipSummary[];
    pendingInvitations?: VaultInvitationSummary[];
  };
  accessToken: string;
  refreshToken: string;
}
