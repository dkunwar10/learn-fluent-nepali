import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchTaskSet, fetchTask, fetchTestScores, TaskSet, Task } from '../../api/taskService';
import { getFileUrl } from '../../api/fileService';
import TaskItem from '../../components/TaskItem.component';

const TaskView: React.FC = () => {
  const { taskSetId } = useParams<{ taskSetId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [taskSet, setTaskSet] = useState<TaskSet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);

  // Score related states
  const [scores, setScores] = useState<any>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [loadingScores, setLoadingScores] = useState<boolean>(false);

  // Fetch task set data when component mounts
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/');
      return;
    }

    if (!taskSetId) {
      setError('No task set ID provided');
      setLoading(false);
      return;
    }

    const loadTaskSet = async () => {
      try {
        setLoading(true);
        console.log('Starting to fetch task set with ID:', taskSetId);

        // Fetch the task set without including full tasks (for faster initial load)
        // The API will still return task_ids because we set include_task_ids: true in the service
        const taskSetData = await fetchTaskSet(taskSetId, user, { include_tasks: false });
        console.log('Task set data received:', taskSetData);
        setTaskSet(taskSetData);

        // Process input metadata for audio preview in parallel with task loading
        let audioPreviewPromise = null;
        if (taskSetData.input_metadata) {
          console.log('Input metadata found, processing in parallel:', taskSetData.input_metadata);
          const { object_name, folder } = taskSetData.input_metadata;

          if (object_name && folder) {
            // Start the audio URL fetch but don't await it yet - we'll process it in parallel
            console.log(`Fetching audio URL for object: ${object_name}, folder: ${folder}`);
            audioPreviewPromise = getFileUrl(object_name, folder, user);
          }
        }

        // Check for tasks in the response
        if (taskSetData.tasks && taskSetData.tasks.length > 0) {
          console.log('Tasks found in response:', taskSetData.tasks);

          // If tasks are already included in the response, use them directly
          // Convert task IDs to actual task objects if they're not already
          if (typeof taskSetData.tasks[0] === 'string') {
            // We have task IDs, need to fetch the first task
            console.log('Tasks are IDs, fetching first task');
            setLoadingTasks(true);
            try {
              const firstTask = await fetchTask(taskSetData.tasks[0], user);
              console.log('First task loaded:', firstTask);

              // Set the first task only
              setTasks([firstTask]);
              setLoadingTasks(false);
            } catch (firstTaskErr) {
              console.error('Error loading first task:', firstTaskErr);
              setError('Failed to load task. Please try again.');
              setLoadingTasks(false);
            }
          } else {
            // Tasks are already full objects, use them directly
            console.log('Tasks are full objects, using directly');
            setTasks([taskSetData.tasks[0]]);
          }
        } else {
          console.error('No tasks found in task set');
          setError('No tasks found in this task set');
        }

        // Now resolve the audio preview promise if it exists
        if (audioPreviewPromise) {
          try {
            console.log('Resolving audio preview promise');
            const audioUrl = await audioPreviewPromise;
            console.log('Audio URL received:', audioUrl);
            setAudioPreviewUrl(audioUrl);
          } catch (audioErr) {
            console.error('Error fetching audio preview:', audioErr);
            // Don't set an error state, just log it - audio preview is optional
          }
        } else {
          console.log('No audio preview to load');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading task set:', err);
        setError('Failed to load task set. Please try again.');
        setLoading(false);
      }
    };

    loadTaskSet();
  }, [taskSetId, user, isAuthenticated, navigate]);

  // Navigate to next task
  const goToNextTask = async () => {
    if (!taskSet?.tasks) return;

    const nextIndex = currentTaskIndex + 1;
    if (nextIndex < taskSet.tasks.length) {
      // Check if we already have the next task loaded
      if (nextIndex < tasks.length) {
        // We already have this task loaded, just navigate to it
        console.log(`Navigating to already loaded task at index ${nextIndex}`);
        setCurrentTaskIndex(nextIndex);
      } else {
        // We need to fetch the next task
        setLoadingTasks(true);
        try {
          // Check if the task is a string (ID) or an object
          const nextTask = typeof taskSet.tasks[nextIndex] === 'string'
            ? await fetchTask(taskSet.tasks[nextIndex], user)
            : taskSet.tasks[nextIndex];

          console.log('Next task loaded:', nextTask);

          // Add the new task to our tasks array
          setTasks(prevTasks => [...prevTasks, nextTask]);

          // Navigate to the new task
          setCurrentTaskIndex(nextIndex);
        } catch (error) {
          console.error('Error fetching next task:', error);
          setError('Failed to load next task. Please try again.');
          // Don't navigate if we couldn't fetch the task
        } finally {
          setLoadingTasks(false);
        }
      }
    }
  };

  // Navigate to previous task
  const goToPreviousTask = () => {
    if (currentTaskIndex > 0) {
      console.log(`Navigating to previous task at index ${currentTaskIndex - 1}`);
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  // Render current task based on its type
  const renderCurrentTask = () => {
    if (tasks.length === 0) {
      if (loadingTasks) {
        return (
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-600">Loading task...</p>
          </div>
        );
      }
      return null;
    }

    // Check if the current task index is valid
    if (currentTaskIndex >= tasks.length) {
      if (loadingTasks) {
        return (
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-600">Loading next task...</p>
          </div>
        );
      }

      // If we have tasks but the current task isn't loaded yet, try to load it
      if (taskSet?.tasks && currentTaskIndex < taskSet.tasks.length) {
        // Trigger loading of the current task
        const loadCurrentTask = async () => {
          setLoadingTasks(true);
          try {
            // Check if the task is a string (ID) or an object
            const currentTaskData = taskSet.tasks[currentTaskIndex];
            const task = typeof currentTaskData === 'string'
              ? await fetchTask(currentTaskData, user)
              : currentTaskData;

            console.log(`Task at index ${currentTaskIndex} loaded:`, task);
            setTasks(prevTasks => [...prevTasks, task]);
          } catch (error) {
            console.error('Error fetching task:', error);
            setError('Failed to load task. Please try refreshing the page.');
          } finally {
            setLoadingTasks(false);
          }
        };

        // Call the function to load the task
        loadCurrentTask();

        // Show loading indicator while fetching
        return (
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-600">Loading task...</p>
          </div>
        );
      }

      return (
        <div className="p-4 bg-yellow-100 rounded-lg">
          <p>Task not found. Please try refreshing the page.</p>
        </div>
      );
    }

    const currentTask = tasks[currentTaskIndex];

    // Log the task data to debug
    console.log('Rendering task:', currentTask);
    console.log('Task ID:', currentTask.id || currentTask._id);

    // Get the score for the current task
    const currentTaskScore = scores?.tasks?.find(
      (t: any) => t.task_id === (currentTask.id || currentTask._id)
    );

    console.log('Current task score data:', currentTaskScore);
    console.log('Set max score:', scores?.max_score);

    // Use the TaskItem component to render the current task
    return (
      <TaskItem
        task={currentTask}
        onAnswerSubmitted={handleAnswerSubmitted}
        onNext={goToNextTask}
        score={currentTaskScore?.score}
        maxScore={scores?.max_score || 50} // Use the set's max_score
      />
    );
  };

  // Fetch test scores
  const fetchScores = async () => {
    if (!taskSetId || !user) return;

    try {
      setLoadingScores(true);
      const scoresData = await fetchTestScores(taskSetId, user);
      console.log('Scores data:', scoresData);

      // Log score data structure for debugging
      if (scoresData) {
        console.log('Task set max score:', scoresData.max_score);
        console.log('Task set scored:', scoresData.scored);

        if (scoresData.tasks) {
          console.log('Individual task scores:');
          scoresData.tasks.forEach((task: any) => {
            console.log(`Task ${task.task_id}: score=${task.score}`);
          });
        }
      }

      setScores(scoresData);

      // Set the total score and max score
      if (scoresData) {
        // Use the scored value from the API if available, otherwise calculate from tasks
        const total = scoresData.scored !== undefined ? scoresData.scored :
          scoresData.tasks ? scoresData.tasks.reduce((sum: number, task: any) => sum + (task.score || 0), 0) : 0;

        // Use the max_score from the API directly
        const max = scoresData.max_score || 0;

        console.log(`Setting totalScore=${total}, maxScore=${max}`);
        setTotalScore(total);
        setMaxScore(max);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
    } finally {
      setLoadingScores(false);
    }
  };

  // Fetch scores when component mounts
  useEffect(() => {
    if (taskSetId && user && isAuthenticated) {
      fetchScores();
    }
  }, [taskSetId, user, isAuthenticated]);

  // Handle answer submission
  const handleAnswerSubmitted = (taskId: string, isCorrect: boolean) => {
    console.log(`Answer submitted for task ${taskId}. Correct: ${isCorrect}`);

    // Fetch updated scores after answer submission
    fetchScores();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <button
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-700">Learning Tasks</h1>

          {/* Score display */}
          <div className="flex items-center">
            {loadingScores ? (
              <div className="flex items-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500 mr-2"></div>
                <span>Loading scores...</span>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <div className="text-lg font-semibold text-purple-700">
                  Score: {totalScore}/{scores?.max_score || maxScore}
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2.5 mt-1">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full"
                    style={{ width: `${scores?.max_score > 0 ? (totalScore / scores.max_score) * 100 : maxScore > 0 ? (totalScore / maxScore) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audio preview section */}
        {audioPreviewUrl ? (
          <div className="mt-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-2">Your Recording:</h3>
            <audio controls className="w-full">
              <source src={audioPreviewUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        ) : taskSet?.input_metadata?.object_name ? (
          <div className="mt-4 mb-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">Audio Preview:</h3>
            <p className="text-sm text-gray-600">Loading audio preview...</p>
            <div className="animate-pulse rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500 mx-auto mt-2"></div>
          </div>
        ) : null}

        <div className="flex items-center mt-2">
          <div className="flex space-x-2 mb-4">
            {taskSet?.tasks?.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentTaskIndex
                    ? 'bg-purple-600'
                    : index < currentTaskIndex
                      ? 'bg-purple-300'
                      : index < tasks.length
                        ? 'bg-gray-200'
                        : 'bg-gray-300'
                }`}
              ></div>
            ))}
            {loadingTasks && (
              <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse ml-2"></div>
            )}
          </div>
          <div className="ml-auto text-sm text-gray-500 flex items-center">
            {loadingTasks && (
              <div className="mr-2 w-4 h-4 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
            )}

            {/* Task score indicator */}
            {scores && scores.tasks && tasks[currentTaskIndex] && (
              <div className="mr-3 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  scores.tasks.find((t: any) => t.task_id === (tasks[currentTaskIndex].id || tasks[currentTaskIndex]._id))?.score > 0
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}></span>
                <span>
                  {(() => {
                    const taskScore = scores.tasks.find((t: any) =>
                      t.task_id === (tasks[currentTaskIndex].id || tasks[currentTaskIndex]._id)
                    );
                    return `${taskScore?.score || 0} pt`;
                  })()}
                </span>
              </div>
            )}

            Task {currentTaskIndex + 1} of {taskSet?.tasks?.length || 0}
          </div>
        </div>
      </div>

      {renderCurrentTask()}

      <div className="mt-6 flex justify-between">
        <button
          className={`px-4 py-2 rounded-lg ${
            currentTaskIndex > 0
              ? 'bg-gray-200 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={goToPreviousTask}
          disabled={currentTaskIndex === 0 || loadingTasks}
        >
          {loadingTasks ? (
            <span className="flex items-center">
              <span className="w-4 h-4 mr-2 border-t-2 border-b-2 border-gray-400 rounded-full animate-spin"></span>
              Previous
            </span>
          ) : (
            'Previous'
          )}
        </button>

        <button
          className={`px-4 py-2 rounded-lg ${
            taskSet?.tasks && currentTaskIndex < taskSet.tasks.length - 1
              ? loadingTasks
                ? 'bg-purple-400 text-white'
                : 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-purple-300 text-white cursor-not-allowed'
          }`}
          onClick={goToNextTask}
          disabled={!taskSet?.tasks || currentTaskIndex >= taskSet.tasks.length - 1 || loadingTasks}
        >
          {loadingTasks ? (
            <span className="flex items-center">
              <span className="w-4 h-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
              Loading
            </span>
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default TaskView;
