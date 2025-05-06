
import React, { createContext, useContext, useState, useEffect } from "react";
import { UserData } from "../types/User";

interface AuthContextType {
  user: UserData | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  login: (userData: UserData) => void;
  logout: () => void;
  setTenantSlug: (slug: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load user data from localStorage on mount
    const storedUser = localStorage.getItem("nepali_user");
    const storedTenantSlug = localStorage.getItem("tenant_slug");
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("nepali_user");
        setIsAuthenticated(false);
      }
    }

    if (storedTenantSlug) {
      setTenantSlug(storedTenantSlug);
    }
  }, []);

  const login = (userData: UserData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("nepali_user", JSON.stringify(userData));
    
    if (userData.tenantSlug) {
      setTenantSlug(userData.tenantSlug);
      localStorage.setItem("tenant_slug", userData.tenantSlug);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("nepali_user");
    // Note: We don't remove tenant_slug on logout as per requirements
  };

  const updateTenantSlug = (slug: string) => {
    setTenantSlug(slug);
    localStorage.setItem("tenant_slug", slug);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantSlug,
        isAuthenticated,
        login,
        logout,
        setTenantSlug: updateTenantSlug
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
