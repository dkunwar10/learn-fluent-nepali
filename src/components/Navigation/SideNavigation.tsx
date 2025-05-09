
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutList, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem
} from '@/components/ui/sidebar';

/**
 * Side navigation component for the application
 */
const SideNavigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = () => {
    logout();
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-center py-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-sidebar-foreground">Nepali App</h2>
          <p className="text-xs text-sidebar-foreground/70 mt-1">Language Learning</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/dashboard')} tooltip="Dashboard">
              <Link to="/dashboard">
                <Home className="size-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/tasks')} tooltip="Tasks">
              <Link to="/tasks">
                <LayoutList className="size-4" />
                <span>Tasks</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Settings">
              <Link to="/settings">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="pb-4">
        {user && (
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="bg-sidebar-accent rounded-full p-2">
                <User className="size-4 text-sidebar-accent-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name || 'User'}</span>
                <span className="text-xs text-sidebar-foreground/70">{user.email}</span>
              </div>
            </div>
            
            <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
              <LogOut className="size-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default SideNavigation;
