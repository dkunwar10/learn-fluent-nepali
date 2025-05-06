
import { UserData, LoginResponse } from "../types/User";

const API_URL = import.meta.env.VITE_API_URL || "https://api.example.com";

export const validateTenant = async (slug: string): Promise<boolean> => {
  try {
    // In a real application, this would make an API call to validate the tenant
    // For now, we'll simulate success for testing purposes
    console.log(`Validating tenant: ${slug}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock validation - in production this would check against your API
    return true;
  } catch (error) {
    console.error("Error validating tenant:", error);
    return false;
  }
};

export const loginUser = async (
  email: string,
  password: string,
  tenantSlug: string
): Promise<LoginResponse> => {
  try {
    console.log(`Logging in user: ${email} for tenant: ${tenantSlug}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful login response
    // In production, this would be replaced with a real API call
    const mockUser: UserData = {
      id: "user-123",
      name: "Demo User",
      email: email,
      role: "user",
      token: "mock-jwt-token",
      tenantSlug: tenantSlug
    };
    
    return {
      success: true,
      user: mockUser
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login failed. Please check your credentials."
    };
  }
};
