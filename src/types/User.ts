
export interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  token: string;
  tenantSlug?: string;
  tenantId?: string;
  tenantLabel?: string;
  tokenType?: string;
  virtueProjectNameId?: string; // Added for future use
}

export interface LoginResponse {
  success: boolean;
  user?: UserData;
  message?: string;
}
