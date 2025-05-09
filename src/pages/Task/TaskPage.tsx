
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import TaskList from '@/components/Task/TaskList';

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Fixed page header */}
      <div className="bg-white shadow">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold">Task Sets</h1>
          <p className="text-gray-500">View and manage your task sets</p>
        </div>
      </div>

      {/* Main content with TaskList */}
      <div className="flex-grow container mx-auto">
        <TaskList />
      </div>
    </div>
  );
};

export default TaskPage;
