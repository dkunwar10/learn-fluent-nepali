import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Send, Loader2, RefreshCw, Square, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { submitTaskAnswers, TaskAnswer, TaskSet } from "@/api/taskService";

// Quiz types from backend
enum QuizType {
  MULTIPLE_CHOICE = "multiple_choice",
  IMAGE_IDENTIFICATION = "image_identification",
  SPEAK_WORD = "speak_word",
  ANSWER_IN_WORD = "answer_in_word",
}

interface Quiz {
  id: string;
  type: QuizType;
  question?: string;
  options?: string[];
  answer?: string;
  word?: string;
  audio_hint_url?: string;
  image_url?: string;
}

interface QuizResult {
  is_correct: boolean;
  score: number;
  correct_answer?: string;
  feedback?: string;
}

interface UserScore {
  total_score: number;
  total_attempts: number;
  correct_answers: number;
  accuracy: number;
}

const BeginLearning: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("text");
  const wsRef = useRef<WebSocket | null>(null);

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

  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task state
  const [taskSetId, setTaskSetId] = useState<string | null>(null);
  const [taskSet, setTaskSet] = useState<TaskSet | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [taskAnswers, setTaskAnswers] = useState<TaskAnswer[]>([]);
  const [taskSubmissionResult, setTaskSubmissionResult] = useState<any | null>(null);

  // Text input state
  const [textInput, setTextInput] = useState("");

  // Connect to WebSocket function (will be called when needed)
  const connectWebSocket = (streamType: string) => {
    if (!user) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000/v1'}/ws/stream/${streamType}?token=${user.token}`);

    ws.onopen = () => {
      console.log(`WebSocket connected (${streamType})`);
      setWsConnected(true);
      toast({
        title: "Connected",
        description: `WebSocket connection established for ${streamType} streaming`,
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);

        if (data.type === "connection_established") {
          setConnectionId(data.connection_id);
        } else if (data.type === "quiz") {
          // Handle both single quiz object and array of quiz objects
          if (Array.isArray(data.content)) {
            // If it's an array, store all quizzes and set the first one as current
            if (data.content.length > 0) {
              console.log("Received quiz array with", data.content.length, "quizzes");
              setQuizzes(data.content);
              setCurrentQuizIndex(0);
              setCurrentQuiz(data.content[0]);
              setQuizResult(null);
              setUserAnswer("");
            }
          } else {
            // Handle single quiz object
            console.log("Received single quiz:", data.content);
            setQuizzes([data.content]);
            setCurrentQuizIndex(0);
            setCurrentQuiz(data.content);
            setQuizResult(null);
            setUserAnswer("");
          }
        } else if (data.type === "quiz_result") {
          setQuizResult(data.content.result);
          if (data.content.user_score) {
            setUserScore(data.content.user_score);
          }
        } else if (data.type === "task_generation") {
          // Handle task generation message
          console.log("Received task generation message:", data);

          // Extract task set ID from the message
          const receivedTaskSetId = data.task_set_id;
          if (receivedTaskSetId) {
            setTaskSetId(receivedTaskSetId);

            // Navigate to the TaskView page with the task set ID
            toast({
              title: "Task Set Generated",
              description: "Navigating to task view...",
            });

            // Use a small timeout to ensure the toast is shown before navigation
            setTimeout(() => {
              navigate(`/beginlearning/task/${receivedTaskSetId}`);
            }, 500);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
      setConnectionId(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server",
        variant: "destructive",
      });
    };

    wsRef.current = ws;
    return ws;
  };

  // Clean up WebSocket and audio resources on component unmount
  useEffect(() => {
    return () => {
      // Clean up WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Clean up audio resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
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
      // Connect to WebSocket first if not already connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket(activeTab);
      }

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

  // Send recorded audio to server
  const sendAudioRecording = () => {
    if (!audioBlob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Connect WebSocket if not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const ws = connectWebSocket(activeTab);

        // Wait for connection to open before sending
        if (ws) {
          ws.addEventListener('open', () => {
            if (audioBlob) {
              ws.send(audioBlob);
              toast({
                title: "Audio Sent",
                description: "Your audio has been sent for processing",
              });
            }
          });
        }
        return;
      }
      return;
    }

    // Send the audio blob
    wsRef.current.send(audioBlob);
    toast({
      title: "Audio Sent",
      description: "Your audio has been sent for processing",
    });
  };

  // Reset recording state
  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingState("idle");
    setAudioVisualizerData([]);
  };

  // Navigate to the next quiz
  const goToNextQuiz = () => {
    if (quizzes.length > 0 && currentQuizIndex < quizzes.length - 1) {
      const nextIndex = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIndex);
      setCurrentQuiz(quizzes[nextIndex]);
      setQuizResult(null);
      setUserAnswer("");
    }
  };

  // Navigate to the previous quiz
  const goToPrevQuiz = () => {
    if (quizzes.length > 0 && currentQuizIndex > 0) {
      const prevIndex = currentQuizIndex - 1;
      setCurrentQuizIndex(prevIndex);
      setCurrentQuiz(quizzes[prevIndex]);
      setQuizResult(null);
      setUserAnswer("");
    }
  };

  // Send text message
  const sendTextMessage = () => {
    if (!textInput.trim()) return;

    // Connect WebSocket if not connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const ws = connectWebSocket(activeTab);

      // Wait for connection to open before sending
      if (ws) {
        ws.addEventListener('open', () => {
          const message = {
            type: "text",
            content: textInput,
          };

          ws.send(JSON.stringify(message));
          setTextInput("");
        });
      }
      return;
    }

    // If already connected, send immediately
    const message = {
      type: "text",
      content: textInput,
    };

    wsRef.current.send(JSON.stringify(message));
    setTextInput("");
  };

  // Submit quiz answer
  const submitQuizAnswer = () => {
    if (!currentQuiz || !userAnswer || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setIsSubmitting(true);

    const message = {
      type: "quiz_answer",
      quiz_data: currentQuiz,
      user_answer: userAnswer,
    };

    wsRef.current.send(JSON.stringify(message));

    // Reset submission state after a delay
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  // Update task answer
  const updateTaskAnswer = (taskId: string, answer: string) => {
    setTaskAnswers(prevAnswers => {
      const updatedAnswers = [...prevAnswers];
      const answerIndex = updatedAnswers.findIndex(a => a.task_id === taskId);

      if (answerIndex !== -1) {
        updatedAnswers[answerIndex] = {
          ...updatedAnswers[answerIndex],
          user_answer: answer
        };
      }

      return updatedAnswers;
    });
  };

  // Submit task answers
  const submitTaskSetAnswers = async () => {
    if (!taskSetId || !taskAnswers.length || !user) return;

    setIsSubmitting(true);

    try {
      const result = await submitTaskAnswers(taskSetId, taskAnswers, user);
      setTaskSubmissionResult(result);

      toast({
        title: "Answers Submitted",
        description: "Your answers have been submitted successfully.",
      });

      // Update user score if available
      if (result.user_score) {
        setUserScore(result.user_score);
      }
    } catch (error) {
      console.error("Error submitting task answers:", error);
      toast({
        title: "Submission Error",
        description: "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render task based on type
  const renderTask = () => {
    if (!taskSet || !taskSet.tasks || taskSet.tasks.length === 0 || currentTaskIndex >= taskSet.tasks.length) {
      return (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-500">No tasks available</p>
        </div>
      );
    }

    const currentTask = taskSet.tasks[currentTaskIndex];
    const currentAnswer = String(taskAnswers.find(a => a.task_id === currentTask.id)?.user_answer || "");

    // Render task based on type (similar to quiz rendering)
    switch (currentTask.type) {
      case "multiple_choice":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentTask.question}</h3>
            <div className="space-y-3">
              {currentTask.options?.map((option, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all",
                    currentAnswer === option
                      ? "bg-nepali-blue/10 border-nepali-blue"
                      : "hover:bg-gray-50 border-gray-200"
                  )}
                  onClick={() => updateTaskAnswer(currentTask.id, option)}
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
                    <label
                      htmlFor={`option-${index}`}
                      className={cn(
                        "flex-1 cursor-pointer",
                        currentAnswer === option ? "font-medium text-nepali-blue" : "text-gray-700"
                      )}
                    >
                      {option}
                    </label>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "text_input":
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
                onChange={(e) => updateTaskAnswer(currentTask.id, e.target.value)}
                placeholder="Type your answer"
                className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-nepali-blue focus:border-transparent transition-all text-lg"
                onKeyDown={(e) => e.key === 'Enter' && currentAnswer && !isSubmitting && submitTaskSetAnswers()}
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

  // Navigate to the next task
  const goToNextTask = () => {
    if (taskSet && taskSet.tasks && currentTaskIndex < taskSet.tasks.length - 1) {
      setCurrentTaskIndex(prevIndex => prevIndex + 1);
    }
  };

  // Navigate to the previous task
  const goToPrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(prevIndex => prevIndex - 1);
    }
  };

  // Render quiz based on type
  const renderQuiz = () => {
    if (!currentQuiz) return null;

    switch (currentQuiz.type) {
      case QuizType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentQuiz.question}</h3>
            <div className="space-y-3">
              {currentQuiz.options?.map((option, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all",
                    userAnswer === option
                      ? "bg-nepali-blue/10 border-nepali-blue"
                      : "hover:bg-gray-50 border-gray-200"
                  )}
                  onClick={() => setUserAnswer(option)}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center mr-3",
                      userAnswer === option
                        ? "border-nepali-blue bg-nepali-blue/10"
                        : "border-gray-300"
                    )}>
                      {userAnswer === option && (
                        <div className="w-3 h-3 rounded-full bg-nepali-blue" />
                      )}
                    </div>
                    <label
                      htmlFor={`option-${index}`}
                      className={cn(
                        "flex-1 cursor-pointer",
                        userAnswer === option ? "font-medium text-nepali-blue" : "text-gray-700"
                      )}
                    >
                      {option}
                    </label>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={submitQuizAnswer}
                disabled={!userAnswer || isSubmitting}
                className="w-full bg-nepali-blue hover:bg-nepali-blue/90 text-white py-6 text-lg"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Submit Answer
              </Button>
            </motion.div>
          </div>
        );

      case QuizType.SPEAK_WORD:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800 text-center">Speak this word:</h3>
            <div className="text-3xl font-bold text-center py-6 text-nepali-maroon bg-nepali-yellow/10 rounded-lg border border-nepali-yellow/20">
              {currentQuiz.word}
            </div>
            {currentQuiz.audio_hint_url && (
              <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Listen to the pronunciation:</p>
                <audio src={currentQuiz.audio_hint_url} controls className="mx-auto" />
              </div>
            )}
            <div className="flex justify-center pt-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "default"}
                  className={cn(
                    "rounded-full p-6 shadow-lg",
                    isRecording ? "bg-red-500 hover:bg-red-600" : "bg-nepali-red hover:bg-nepali-red/90"
                  )}
                >
                  {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
              </motion.div>
            </div>
            <p className="text-center text-gray-500">
              {isRecording ? "Recording... Click to stop" : "Click the microphone to start recording"}
            </p>
          </div>
        );

      case QuizType.ANSWER_IN_WORD:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentQuiz.question}</h3>
            {currentQuiz.image_url && (
              <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <img src={currentQuiz.image_url} alt="Quiz" className="mx-auto max-h-60 object-contain rounded" />
              </div>
            )}
            <div className="pt-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer"
                className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-nepali-blue focus:border-transparent transition-all text-lg"
                onKeyDown={(e) => e.key === 'Enter' && userAnswer && !isSubmitting && submitQuizAnswer()}
              />
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={submitQuizAnswer}
                disabled={!userAnswer || isSubmitting}
                className="w-full bg-nepali-blue hover:bg-nepali-blue/90 text-white py-6 text-lg"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Submit Answer
              </Button>
            </motion.div>
          </div>
        );

      case QuizType.IMAGE_IDENTIFICATION:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-800">{currentQuiz.question}</h3>
            {currentQuiz.image_url && (
              <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <img src={currentQuiz.image_url} alt="Quiz" className="mx-auto max-h-60 object-contain rounded" />
              </div>
            )}
            <div className="space-y-3">
              {currentQuiz.options?.map((option, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all",
                    userAnswer === option
                      ? "bg-nepali-blue/10 border-nepali-blue"
                      : "hover:bg-gray-50 border-gray-200"
                  )}
                  onClick={() => setUserAnswer(option)}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center mr-3",
                      userAnswer === option
                        ? "border-nepali-blue bg-nepali-blue/10"
                        : "border-gray-300"
                    )}>
                      {userAnswer === option && (
                        <div className="w-3 h-3 rounded-full bg-nepali-blue" />
                      )}
                    </div>
                    <label
                      htmlFor={`option-${index}`}
                      className={cn(
                        "flex-1 cursor-pointer",
                        userAnswer === option ? "font-medium text-nepali-blue" : "text-gray-700"
                      )}
                    >
                      {option}
                    </label>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={submitQuizAnswer}
                disabled={!userAnswer || isSubmitting}
                className="w-full bg-nepali-blue hover:bg-nepali-blue/90 text-white py-6 text-lg"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Submit Answer
              </Button>
            </motion.div>
          </div>
        );

      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500">Unsupported quiz type</p>
          </div>
        );
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-nepali-maroon">Begin Learning</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <Tabs defaultValue="text" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-nepali-blue">Text Input</CardTitle>
              <CardDescription>Send text messages to generate quizzes</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message"
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-nepali-blue focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                />
                <Button
                  onClick={sendTextMessage}
                  disabled={!textInput.trim()}
                  className="bg-nepali-blue hover:bg-nepali-blue/90 text-white transition-all"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="mt-4">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-nepali-maroon">Audio Input</CardTitle>
              <CardDescription>Record and send audio to generate quizzes</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
                      onClick={startRecording}
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
                      onClick={stopRecording}
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

                      <Button
                        onClick={sendAudioRecording}
                        className="bg-nepali-blue hover:bg-nepali-blue/90 text-white"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Recording
                      </Button>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-gray-500 text-center">
                  {recordingState === "idle" && "Click the microphone to start recording"}
                  {recordingState === "recording" && "Recording in progress... Click the square to stop"}
                  {recordingState === "recorded" && "Recording complete. Send or record again."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="mt-4">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-nepali-blue">Video Input</CardTitle>
              <CardDescription>Video streaming is not implemented in this demo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p className="text-center text-gray-500">Video streaming functionality is coming soon</p>
              <Button className="mt-4" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Updates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Display Quiz Card */}
      {currentQuiz && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mt-8 shadow-lg border border-gray-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-nepali-yellow/10 to-white">
              <div className="flex justify-between items-center">
                <CardTitle className="text-nepali-maroon flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Quiz
                </CardTitle>
                {quizzes.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Quiz {currentQuizIndex + 1} of {quizzes.length}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevQuiz}
                        disabled={currentQuizIndex === 0}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextQuiz}
                        disabled={currentQuizIndex === quizzes.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <CardDescription>Answer the question based on your input</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {renderQuiz()}
            </CardContent>
            {quizResult && (
              <CardFooter className="flex flex-col items-start bg-gray-50 border-t">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "p-4 rounded-md w-full shadow-sm",
                    quizResult.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  )}
                >
                  <div className="flex items-center">
                    {quizResult.is_correct ? (
                      <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    )}
                    <p className="font-bold">{quizResult.is_correct ? 'Correct!' : 'Incorrect'}</p>
                  </div>

                  {!quizResult.is_correct && quizResult.correct_answer && (
                    <p className="mt-2 text-gray-700">Correct answer: <span className="font-semibold">{quizResult.correct_answer}</span></p>
                  )}
                  {quizResult.feedback && <p className="mt-1 text-gray-600">{quizResult.feedback}</p>}
                  <p className="mt-2 font-medium">Points earned: <span className="text-nepali-blue">{quizResult.score}</span></p>
                </motion.div>

                {userScore && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-4 w-full"
                  >
                    <h3 className="font-medium mb-2 text-gray-700">Your Progress</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                        <p className="text-sm text-gray-600">Total Score</p>
                        <p className="font-bold text-2xl text-nepali-blue">{userScore.total_score}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                        <p className="text-sm text-gray-600">Accuracy</p>
                        <p className="font-bold text-2xl text-green-600">{Math.round(userScore.accuracy * 100)}%</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardFooter>
            )}
          </Card>
        </motion.div>
      )}

      {/* Display Task Set Card */}
      {taskSet && taskSet.tasks && taskSet.tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mt-8 shadow-lg border border-gray-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
              <div className="flex justify-between items-center">
                <CardTitle className="text-nepali-blue flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  Task Set
                </CardTitle>
                {taskSet.tasks.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Task {currentTaskIndex + 1} of {taskSet.tasks.length}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevTask}
                        disabled={currentTaskIndex === 0}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextTask}
                        disabled={currentTaskIndex === taskSet.tasks.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <CardDescription>Complete the tasks to improve your skills</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {renderTask()}
            </CardContent>
            <CardFooter className="flex justify-between bg-gray-50 border-t p-4">
              <Button
                variant="outline"
                onClick={() => setTaskSet(null)}
                className="text-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={submitTaskSetAnswers}
                disabled={isSubmitting || !taskAnswers.some(a => a.user_answer)}
                className="bg-nepali-blue hover:bg-nepali-blue/90 text-white"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Answers
              </Button>
            </CardFooter>
            {taskSubmissionResult && (
              <CardFooter className="flex flex-col items-start bg-gray-50 border-t pt-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 rounded-md w-full shadow-sm bg-blue-50 border border-blue-200 mt-4"
                >
                  <h3 className="font-bold text-lg text-nepali-blue mb-2">Submission Results</h3>
                  <p className="text-gray-700">Total Score: <span className="font-semibold">{taskSubmissionResult.total_score}</span></p>
                  {taskSubmissionResult.user_score && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Your Progress</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <p className="text-sm text-gray-600">Total Score</p>
                          <p className="font-bold text-xl text-nepali-blue">{taskSubmissionResult.user_score.total_score}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-green-100">
                          <p className="text-sm text-gray-600">Accuracy</p>
                          <p className="font-bold text-xl text-green-600">
                            {Math.round(taskSubmissionResult.user_score.accuracy * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      )}

      {/* Loading Indicator - Removed as we now navigate to TaskView */}
    </div>
  );
};

export default BeginLearning;
