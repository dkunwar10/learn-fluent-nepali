import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';
import { ArrowLeft } from 'lucide-react';

interface TaskViewLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component for task view pages that includes side navigation and back button
 */
const TaskViewLayout: React.FC<TaskViewLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came from the tasks list page
  const fromTasksList = location.state?.from === 'tasks';
  
  const handleBackClick = () => {
    navigate('/tasks');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <SideNavigation />
        <SidebarInset>
          <div className="flex flex-col h-screen">
            {/* Page header */}
            <div className="bg-white shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {fromTasksList && (
                    <button 
                      onClick={handleBackClick}
                      className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Back to tasks"
                    >
                      <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-purple-700">Task Details</h1>
                    <p className="text-gray-500">Complete your learning tasks</p>
                  </div>
                </div>
                <SidebarTrigger />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-grow overflow-y-auto">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default TaskViewLayout;
