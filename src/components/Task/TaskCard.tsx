import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TaskSet } from '@/api/taskListService';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  task: TaskSet;
}

/**
 * Component for displaying a task set as a card
 */
const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate();

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Calculate completion percentage
  const taskCount = task.tasks ? task.tasks.length : 0;
  const completedCount = 0; // We don't have this information in the new API response
  const completionPercentage = taskCount > 0
    ? Math.round((completedCount / taskCount) * 100)
    : 0;

  // Get status badge color
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-500';

    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (task && task._id) {
      // Navigate to task detail page and pass state to indicate we came from tasks list
      navigate(`/tasks/${task._id}`, { state: { from: 'tasks' } });
    }
  };

  // If task is undefined or missing required properties, show a placeholder
  if (!task || !task._id) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Task data unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Unable to display this task</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold">Test TODO:</h3>
          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            {task.status ? task.status.replace(/_/g, ' ') : 'pending'}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Created: {formatDate(task.created_at)}
        </p>

        <p className="text-sm font-medium mb-4">
          {task.input_type === 'audio' ? 'Audio Task' : task.input_type}
        </p>

        <div className="mb-1">
          <div className="text-xs text-gray-500 mb-1">Completion</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between text-sm mt-4">
          <div>Tasks: {completedCount || 0}/{taskCount || 0}</div>
          {task.scored !== undefined && task.max_score !== undefined ? (
            <div>Score: {task.scored || 0}/{task.max_score || 60}</div>
          ) : (
            <div>Score: 0/60</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
