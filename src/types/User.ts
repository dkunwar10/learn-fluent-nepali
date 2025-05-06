
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: UserData;
  message?: string;
}
