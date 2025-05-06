
import { UserData, LoginResponse } from "../types/User";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/v1";

export const validateTenant = async (slug: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/get_tenant_id?slug=${slug}`);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return !!data.tenant_id;
  } catch (error) {
    console.error("Error validating tenant:", error);
    return false;
  }
};

export const loginUser = async (
  username: string,
  password: string,
  tenantSlug: string
): Promise<LoginResponse> => {
  try {
    // Create URL-encoded form data as specified in the API requirements
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', username);
    formData.append('password', password);
    formData.append('scope', '');
    formData.append('client_id', tenantSlug);

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.detail || 'Login failed',
        user: null
      };
    }

    // Transform backend response to match our UserData type
    const userData: UserData = {
      id: data.id,
      username: data.username,
      email: data.username, // Using username as email since the backend doesn't return email
      role: data.role,
      token: data.access_token,
      tenantSlug: data.tenant_slug,
      tenantId: data.tenant_id,
      tenantLabel: data.tenant_label,
      tokenType: data.token_type,
      virtueProjectNameId: data.tenant_id // Using tenant_id as virtueProjectNameId for now
    };

    return {
      success: true,
      message: 'Login successful',
      user: userData
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: 'An error occurred during login',
      user: null
    };
  }
};
