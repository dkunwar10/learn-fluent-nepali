
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';
import TaskPage from './TaskPage';

/**
 * TaskList page component that wraps the TaskPage with navigation
 */
const TasklistComponent = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SideNavigation />
        <div className="flex-1">
          <TaskPage />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TasklistComponent;
