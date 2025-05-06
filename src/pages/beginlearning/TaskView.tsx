import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Check, X, Mic, Square, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  fetchTaskSet,
  fetchTask,
  submitTaskAnswers,
  submitTaskAnswer,
  TaskSet,
  Task,
  TaskAnswer
} from "@/api/taskService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const TaskView: React.FC = () => {
  const { taskSetId } = useParams<{ taskSetId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for task set and tasks
  const [taskSet, setTaskSet] = useState<TaskSet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskAnswers, setTaskAnswers] = useState<TaskAnswer[]>([]);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCurrent, setIsSubmittingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submission result
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [currentTaskResult, setCurrentTaskResult] = useState<any | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "recorded">("idle");
  const [audioVisualizerData, setAudioVisualizerData] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch task set and first task on component mount
  useEffect(() => {
    if (!isAuthenticated || !user || !taskSetId) {
      navigate("/begin-learning");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch task set details
        const taskSetData = await fetchTaskSet(taskSetId, user, { include_tasks: false });
        setTaskSet(taskSetData);

        if (!taskSetData.tasks || taskSetData.tasks.length === 0) {
          setError("No tasks found in this task set.");
          setIsLoading(false);
          return;
        }

        // Initialize task answers array
        const initialAnswers = taskSetData.tasks.map(taskId => {
          const id = typeof taskId === 'string' ? taskId : taskId.toString();
          console.log("Initializing answer for task ID:", id);
          return {
            task_id: id,
            user_answer: "",
            status: "pending"
          };
        });
        console.log("Initial answers:", initialAnswers);
        setTaskAnswers(initialAnswers);

        // Fetch the first task
        if (taskSetData.tasks.length > 0) {
          const firstTaskId = typeof taskSetData.tasks[0] === 'string'
            ? taskSetData.tasks[0]
            : taskSetData.tasks[0].toString();

          const firstTask = await fetchTask(firstTaskId, user);
          setTasks([firstTask]);
          setCurrentTask(firstTask);
        }
      } catch (err) {
        console.error("Error fetching task data:", err);
        setError("Failed to load task data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user, taskSetId, navigate]);

  // Fetch a task by index
  const fetchTaskByIndex = async (index: number) => {
    if (!user || !taskSet || !taskSet.tasks || index >= taskSet.tasks.length) return;

    setIsLoading(true);
    setCurrentTaskResult(null); // Clear current task result when changing tasks

    // Reset recording state when changing tasks
    if (recordingState !== "idle") {
      resetRecording();
    }

    try {
      const taskId = typeof taskSet.tasks[index] === 'string'
        ? taskSet.tasks[index]
        : taskSet.tasks[index].toString();

      // Check if we already have this task
      const existingTask = tasks.find(t => t.id === taskId);
      if (existingTask) {
        setCurrentTask(existingTask);
        setCurrentTaskIndex(index);
        setIsLoading(false);
        return;
      }

      // Fetch the task
      const taskData = await fetchTask(taskId, user);
      setTasks(prev => [...prev, taskData]);
      setCurrentTask(taskData);
      setCurrentTaskIndex(index);
    } catch (err) {
      console.error("Error fetching task:", err);
      toast({
        title: "Error",
        description: "Failed to load task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to the next task
  const goToNextTask = () => {
    if (!taskSet || !taskSet.tasks) return;

    const nextIndex = currentTaskIndex + 1;
    if (nextIndex < taskSet.tasks.length) {
      setCurrentTaskResult(null); // Clear current task result
      fetchTaskByIndex(nextIndex);
    }
  };

  // Navigate to the previous task
  const goToPrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskResult(null); // Clear current task result
      fetchTaskByIndex(currentTaskIndex - 1);
    }
  };

  // Update task answer
  const updateTaskAnswer = (taskId: string, answer: string | number | boolean) => {
    console.log("Updating answer for task:", taskId, "with value:", answer);

    setTaskAnswers(prev => {
      const updatedAnswers = [...prev];
      const answerIndex = updatedAnswers.findIndex(a => a.task_id === taskId);

      console.log("Found answer index:", answerIndex);

      if (answerIndex !== -1) {
        updatedAnswers[answerIndex] = {
          ...updatedAnswers[answerIndex],
          user_answer: answer,
          status: "pending" // Reset status to pending when answer is updated
        };
        console.log("Updated answer:", updatedAnswers[answerIndex]);
      } else {
        console.log("No matching task found in answers array");
        // If no matching task found, it might be because the task has _id instead of id
        // Add a new answer object to the array
        updatedAnswers.push({
          task_id: taskId,
          user_answer: answer,
          status: "pending"
        });
        console.log("Added new answer for task:", taskId);
      }

      return updatedAnswers;
    });

    // Force a re-render to update the UI
    if (currentTask) {
      // Check both id and _id properties
      if ((currentTask.id && currentTask.id === taskId) ||
          (currentTask._id && currentTask._id === taskId)) {
        setCurrentTask({...currentTask});
      }
    }
  };

  // Submit current task answer
  const submitCurrentTask = async () => {
    if (!user || !currentTask) return;

    // Get task ID from either id or _id property
    const taskId = currentTask.id || currentTask._id;

    // Get the selected answer from the current task
    const currentAnswer = taskAnswers.find(a => a.task_id === taskId);
    if (!currentAnswer || !currentAnswer.user_answer) {
      toast({
        title: "No Answer",
        description: "Please provide an answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingCurrent(true);
    setCurrentTaskResult(null);

    try {
      // For speak_word tasks, make sure we have recorded audio
      if (currentTask.type === "speak_word" && recordingState !== "recorded") {
        toast({
          title: "No Recording",
          description: "Please record your pronunciation before submitting.",
          variant: "destructive",
        });
        setIsSubmittingCurrent(false);
        return;
      }

      // Submit the answer to the backend
      const result = await submitTaskAnswer(
        taskId,
        currentAnswer.user_answer,
        user,
        currentTask.type
      );

      // Update the task result
      setCurrentTaskResult(result);

      // Update the task status in the task answers array
      setTaskAnswers(prev => {
        const updatedAnswers = [...prev];
        const answerIndex = updatedAnswers.findIndex(a => a.task_id === taskId);

        if (answerIndex !== -1) {
          updatedAnswers[answerIndex] = {
            ...updatedAnswers[answerIndex],
            is_correct: result.is_correct,
            status: "completed"
          };
        }

        return updatedAnswers;
      });

      // Show toast notification
      toast({
        title: result.is_correct ? "Correct!" : "Incorrect",
        description: result.feedback || (result.is_correct ? "Great job!" : "Try again."),
        variant: result.is_correct ? "default" : "destructive",
      });

      // Reset recording state after submission for speak_word tasks
      if (currentTask.type === "speak_word") {
        resetRecording();
      }

      // If there are more tasks, go to the next one after a short delay
      if (taskSet && taskSet.tasks && currentTaskIndex < taskSet.tasks.length - 1) {
        setTimeout(() => {
          goToNextTask();
          setCurrentTaskResult(null);
        }, 1500);
      }
    } catch (err) {
      console.error("Error submitting task answer:", err);
      toast({
        title: "Submission Error",
        description: "Failed to submit your answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCurrent(false);
    }
  };

  // Submit all task answers
  const submitAllAnswers = async () => {
    if (!user || !taskSetId || !taskAnswers.length) return;

    setIsSubmitting(true);

    try {
      const result = await submitTaskAnswers(taskSetId, taskAnswers, user);
      setSubmissionResult(result);

      toast({
        title: "Answers Submitted",
        description: "Your answers have been submitted successfully.",
      });
    } catch (err) {
      console.error("Error submitting answers:", err);
      toast({
        title: "Submission Error",
        description: "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (err) {
      return "Unknown date";
    }
  };

  // Audio visualization function
  const visualizeAudio = (stream: MediaStream) => {
    // Create audio context and analyzer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 256;

    // Connect the microphone to the analyzer
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    // Set up the visualization loop
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualization = () => {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);

      // Convert to normalized values for visualization
      const normalizedData = Array.from(dataArray).map(value => value / 255);
      setAudioVisualizerData(normalizedData);

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    // Start the visualization loop
    updateVisualization();
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setRecordingState("recorded");

        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          setAudioVisualizerData([]);
        }

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }

        // Update the task answer with the audio blob
        if (currentTask) {
          // Get task ID from either id or _id property
          const taskId = currentTask.id || currentTask._id;
          updateTaskAnswer(taskId, URL.createObjectURL(audioBlob));
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingState("recording");

      // Start audio visualization
      visualizeAudio(stream);

      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone",
        variant: "destructive",
      });
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Reset recording state
  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingState("idle");
    setAudioVisualizerData([]);

    // Clear the task answer
    if (currentTask) {
      // Get task ID from either id or _id property
      const taskId = currentTask.id || currentTask._id;
      updateTaskAnswer(taskId, "");
    }
  };

  // Handle task input based on task type
  const handleTaskInput = (taskId: string, taskType: string, value: any) => {
    switch (taskType) {
      case "multiple_choice":
        // For multiple choice, value is the selected option
        updateTaskAnswer(taskId, value);
        break;

      case "single_choice":
        // For single choice, value is the selected option (similar to multiple_choice)
        updateTaskAnswer(taskId, value);
        break;

      case "speak_word":
        // For speak word tasks, we need to record audio
        if (recordingState === "idle") {
          startRecording();
        } else if (recordingState === "recording") {
          stopRecording();
        } else if (recordingState === "recorded") {
          // Already recorded, can reset or submit
        }
        break;

      case "text_input":
      case "answer_in_word":
        // For text input tasks, value is the text entered
        updateTaskAnswer(taskId, value);
        break;

      default:
        console.warn(`Unsupported task type: ${taskType}`);
        break;
    }
  };

  // Audio Visualizer Component
  const AudioVisualizer = () => {
    return (
      <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden flex items-end">
        {audioVisualizerData.length > 0 ? (
          audioVisualizerData.map((value, index) => (
            <motion.div
              key={index}
              className="w-1 mx-px bg-gradient-to-t from-nepali-maroon to-nepali-red"
              style={{
                height: `${Math.max(4, value * 100)}%`,
              }}
              initial={{ height: "4%" }}
              animate={{ height: `${Math.max(4, value * 100)}%` }}
              transition={{ duration: 0.05 }}
            />
          ))
        ) : (
          <div className="text-gray-400 text-sm w-full text-center">
            {recordingState === "idle" ? "Start recording to see audio visualization" : "No audio detected"}
          </div>
        )}
      </div>
    );
  };

  // Render task based on type
  const renderTask = () => {
    if (!currentTask) return null;

    // Get task ID from either id or _id property
    const taskId = currentTask.id || currentTask._id;

    const currentAnswerObj = taskAnswers.find(a => a.task_id === taskId);
    console.log("Current task:", currentTask);
    console.log("Task answers:", taskAnswers);
    console.log("Current answer object:", currentAnswerObj);

    const currentAnswer = String(currentAnswerObj?.user_answer || "");

    switch (currentTask.type) {
      case "multiple_choice":
      case "single_choice":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentTask.question}</h3>
            <div className="space-y-3">
              {currentTask.options?.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all w-full text-left",
                    currentAnswer === option
                      ? "bg-nepali-blue/10 border-nepali-blue shadow-md"
                      : "hover:bg-gray-50 border-gray-200"
                  )}
                  onClick={() => {
                    handleTaskInput(taskId, currentTask.type, option);
                  }}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center mr-3",
                      currentAnswer === option
                        ? "border-nepali-blue bg-nepali-blue/10"
                        : "border-gray-300"
                    )}>
                      {currentAnswer === option && (
                        <div className="w-3 h-3 rounded-full bg-nepali-blue" />
                      )}
                    </div>
                    <label className={cn(
                      "flex-1 cursor-pointer",
                      currentAnswer === option ? "font-medium text-nepali-blue" : "text-gray-700"
                    )}>
                      {option}
                    </label>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        );

      case "speak_word":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800 text-center">Speak this word:</h3>
            <div className="text-3xl font-bold text-center py-6 text-nepali-maroon bg-nepali-yellow/10 rounded-lg border border-nepali-yellow/20">
              {currentTask.word}
            </div>
            {currentTask.audio_hint_url && (
              <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Listen to the pronunciation:</p>
                <audio src={currentTask.audio_hint_url} controls className="mx-auto" />
              </div>
            )}

            <div className="mb-6">
              <AudioVisualizer />
            </div>

            <div className="flex flex-col items-center">
              {recordingState === "idle" && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => handleTaskInput(taskId, "speak_word", null)}
                    className="bg-nepali-red hover:bg-nepali-red/90 text-white rounded-full p-6 shadow-lg"
                  >
                    <Mic className="h-8 w-8" />
                  </Button>
                </motion.div>
              )}

              {recordingState === "recording" && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => handleTaskInput(taskId, "speak_word", null)}
                    variant="destructive"
                    className="rounded-full p-6 shadow-lg"
                  >
                    <Square className="h-8 w-8" />
                  </Button>
                </motion.div>
              )}

              {recordingState === "recorded" && (
                <div className="flex flex-col items-center space-y-4 w-full">
                  {audioBlob && (
                    <div className="w-full p-4 bg-gray-50 rounded-lg">
                      <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <Button
                      onClick={resetRecording}
                      variant="outline"
                      className="flex items-center"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Record Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "text_input":
      case "answer_in_word":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentTask.question}</h3>
            {currentTask.image_url && (
              <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <img src={currentTask.image_url} alt="Task" className="mx-auto max-h-60 object-contain rounded" />
              </div>
            )}
            <div className="pt-2">
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => handleTaskInput(taskId, currentTask.type, e.target.value)}
                placeholder="Type your answer"
                className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-nepali-blue focus:border-transparent transition-all text-lg"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500">Unsupported task type: {currentTask.type}</p>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/begin-learning")}
          className="text-gray-600"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Learning
        </Button>

        <h1 className="text-2xl font-bold text-nepali-maroon">Task Session</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-nepali-blue" />
          <p className="ml-2 text-gray-600">Loading task...</p>
        </div>
      ) : error ? (
        <Card className="shadow-lg border border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">Error</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="bg-red-50 border-t border-red-200">
            <Button
              onClick={() => navigate("/begin-learning")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Return to Learning
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {/* Task Set Info */}
          {taskSet && (
            <Card className="mb-6 shadow-sm border border-gray-200">
              <CardHeader className="bg-gray-50 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-nepali-blue">
                      {taskSet.input_type === "audio" ? "Audio" : taskSet.input_type === "text" ? "Text" : "Video"} Input
                    </CardTitle>
                    <CardDescription>
                      Created {taskSet.created_at ? formatDate(taskSet.created_at) : "recently"}
                    </CardDescription>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          View Content
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md p-4 bg-white shadow-lg rounded-lg border">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {taskSet.input_content || "No content available"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Task Navigation Bubbles */}
          {taskSet && taskSet.tasks && taskSet.tasks.length > 0 && (
            <div className="flex justify-center mb-6 overflow-x-auto py-2 px-4">
              <div className="flex space-x-2">
                {taskSet.tasks.map((_, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-2",
                      currentTaskIndex === index
                        ? "border-nepali-blue bg-nepali-blue text-white"
                        : taskAnswers[index]?.status === "completed"
                          ? taskAnswers[index]?.is_correct
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-red-500 bg-red-50 text-red-700"
                          : taskAnswers[index]?.user_answer
                            ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                            : "border-gray-300 bg-gray-50 text-gray-600"
                    )}
                    onClick={() => fetchTaskByIndex(index)}
                  >
                    {taskAnswers[index]?.status === "completed" ? (
                      taskAnswers[index]?.is_correct ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )
                    ) : taskAnswers[index]?.user_answer ? (
                      <span className="text-sm font-medium">●</span>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Current Task */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTaskIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg border border-gray-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-nepali-blue">
                      Task {currentTaskIndex + 1} of {taskSet?.tasks?.length || 0}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevTask}
                        disabled={currentTaskIndex === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextTask}
                        disabled={!taskSet || !taskSet.tasks || currentTaskIndex >= taskSet.tasks.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {renderTask()}

                  {/* Current Task Result */}
                  {currentTaskResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-lg border"
                      style={{
                        backgroundColor: currentTaskResult.is_correct ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 87, 87, 0.1)',
                        borderColor: currentTaskResult.is_correct ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 87, 87, 0.3)'
                      }}
                    >
                      <div className="flex items-center">
                        {currentTaskResult.is_correct ? (
                          <Check className="h-5 w-5 text-green-600 mr-2" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 mr-2" />
                        )}
                        <span className="font-medium">
                          {currentTaskResult.is_correct ? "Correct!" : "Incorrect"}
                        </span>
                      </div>
                      {currentTaskResult.feedback && (
                        <p className="mt-2 text-sm">{currentTaskResult.feedback}</p>
                      )}
                      {!currentTaskResult.is_correct && currentTaskResult.correct_answer && (
                        <p className="mt-2 text-sm">
                          Correct answer: <span className="font-medium">{currentTaskResult.correct_answer}</span>
                        </p>
                      )}
                    </motion.div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between bg-gray-50 border-t p-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/begin-learning")}
                      className="text-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (currentTaskIndex < (taskSet?.tasks?.length || 0) - 1) {
                          goToNextTask();
                        }
                      }}
                      disabled={!taskSet || !taskSet.tasks || currentTaskIndex >= taskSet.tasks.length - 1}
                      className="text-gray-600"
                    >
                      Skip
                    </Button>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={submitCurrentTask}
                      disabled={
                        isSubmittingCurrent ||
                        !currentTask ||
                        !taskAnswers.find(a => a.task_id === (currentTask.id || currentTask._id))?.user_answer
                      }
                      className={cn(
                        "transition-all",
                        isSubmittingCurrent
                          ? "bg-blue-500 text-white"
                          : currentTask && taskAnswers.find(a => a.task_id === (currentTask.id || currentTask._id))?.user_answer
                            ? "bg-green-600 hover:bg-green-700 text-white shadow-md scale-105"
                            : "bg-gray-400 text-white"
                      )}
                    >
                      {isSubmittingCurrent ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </Button>

                    <Button
                      onClick={submitAllAnswers}
                      disabled={isSubmitting || !taskAnswers.some(a => a.user_answer)}
                      className="bg-nepali-blue hover:bg-nepali-blue/90 text-white"
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Submit All
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Submission Result */}
          {submissionResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6"
            >
              <Card className="shadow-lg border border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-nepali-blue">Submission Results</CardTitle>
                  <CardDescription>
                    Total Score: <span className="font-semibold">{submissionResult.total_score}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {submissionResult.results && (
                    <div className="space-y-4">
                      {submissionResult.results.map((result: any, index: number) => (
                        <div
                          key={result.task_id}
                          className={cn(
                            "p-4 rounded-lg border",
                            result.is_correct
                              ? "bg-green-50 border-green-200"
                              : "bg-red-50 border-red-200"
                          )}
                        >
                          <div className="flex items-center">
                            {result.is_correct ? (
                              <Check className="h-5 w-5 text-green-600 mr-2" />
                            ) : (
                              <X className="h-5 w-5 text-red-600 mr-2" />
                            )}
                            <span className="font-medium">
                              Task {index + 1}: {result.is_correct ? "Correct" : "Incorrect"}
                            </span>
                            <span className="ml-auto font-semibold">
                              Score: {result.score}
                            </span>
                          </div>
                          {!result.is_correct && result.correct_answer && (
                            <p className="mt-2 text-sm text-gray-700">
                              Correct answer: <span className="font-medium">{result.correct_answer}</span>
                            </p>
                          )}
                          {result.feedback && (
                            <p className="mt-1 text-sm text-gray-600">{result.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-blue-50 border-t border-blue-200">
                  <Button
                    onClick={() => navigate("/begin-learning")}
                    className="bg-nepali-blue hover:bg-nepali-blue/90 text-white"
                  >
                    Return to Learning
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default TaskView;
