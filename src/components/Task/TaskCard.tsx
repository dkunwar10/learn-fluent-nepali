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
      navigate(`/tasks/${task._id}`);
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
    <Card
      className="w-full hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{task.input_content || 'Untitled Task'}</CardTitle>
          <Badge className={getStatusColor(task.status)}>
            {task.status ? task.status.replace(/_/g, ' ') : 'Unknown'}
          </Badge>
        </div>
        <CardDescription className="text-sm text-gray-500">
          Created: {formatDate(task.created_at)}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm line-clamp-2 mb-3">
          {task.input_type === 'audio' ? 'Audio Task' : task.input_type}
        </p>

        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
          <span>Completion</span>
          <span>{completionPercentage}%</span>
        </div>

        <Progress value={completionPercentage} className="h-2" />
      </CardContent>

      <CardFooter className="pt-2 flex justify-between text-sm">
        <div>Tasks: {completedCount || 0}/{taskCount || 0}</div>
        {task.scored !== undefined && task.max_score !== undefined && (
          <div>Score: {task.scored}/{task.max_score}</div>
        )}
      </CardFooter>
    </Card>
  );
};

export default TaskCard;
