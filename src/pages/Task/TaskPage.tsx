
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import TaskList from '@/components/Task/TaskList';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';

/**
 * Page component for displaying task sets
 */
const TaskPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <SideNavigation />
        <SidebarInset>
          <div className="flex flex-col h-screen">
            {/* Page header */}
            <div className="bg-white shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Task Sets</h1>
                  <p className="text-gray-500">View and manage your task sets</p>
                </div>
                <SidebarTrigger />
              </div>
            </div>

            {/* Main content with TaskList */}
            <div className="flex-grow container mx-auto">
              <TaskList />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default TaskPage;
