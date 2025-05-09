import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, submitTaskAnswer } from '../api/taskService';
import{ uploadAudioFile, FileUploadResponse} from '../api/fileService';
import { useRecorder } from '../hooks/useAudioRecorder';

interface TaskItemProps {
  task: Task;
  onAnswerSubmitted?: (taskId: string, isCorrect: boolean) => void;
  onNext?: () => void;
  score?: number;
  maxScore?: number;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onAnswerSubmitted, onNext, score }) => {
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>(''); // For answer_in_word task type

  // Audio recording states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use the recorder hook
  const {
    recording: isRecording,
    audioUrl: recordedAudioUrl,
    startRecording,
    stopRecording
  } = useRecorder();

  // Reset state when task changes
  useEffect(() => {
    // Reset all state variables when the task changes
    setSelectedOptions([]);
    setSubmissionResult(null);
    setError(null);
    setIsSubmitting(false);
    setIsUploading(false);
    setUploadProgress(0);

    console.log('Task changed, state reset');
  }, [task.id, task._id]); // Depend on task ID to reset when task changes

  // Handle single choice selection
  const handleSingleChoiceSelect = (option: string) => {
    if (isSubmitting) return;

    setSelectedOptions([option]);
  };

  // Handle multiple choice selection
  const handleMultipleChoiceSelect = (option: string) => {
    if (isSubmitting) return;

    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  // Handle single choice submission
  const handleSingleChoiceSubmit = async () => {
    if (isSubmitting || selectedOptions.length === 0) return;

    console.log('Submitting single choice answer:', selectedOptions[0]);
    await submitAnswer(selectedOptions[0]);
  };

  // Submit multiple choice answer
  const handleMultipleChoiceSubmit = async () => {
    if (isSubmitting || selectedOptions.length === 0) return;

    console.log('Submitting multiple choice answers:', selectedOptions);
    await submitAnswer(selectedOptions);
  };

  // Handle audio file upload using the service
  const handleAudioFileUpload = async (audioBlob: Blob): Promise<{object_name: string, folder: string}> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Use the uploadAudioFile service
      const fileInfo = await uploadAudioFile(audioBlob, user);
      console.log('File info returned from uploadAudioFile:', fileInfo);

      // Set progress to 50% after upload completes
      setUploadProgress(50);

      // Simulate progress to 100%
      setTimeout(() => {
        setUploadProgress(100);
      }, 500);

      return {
        object_name: fileInfo.object_name,
        folder: fileInfo.folder
      };
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle audio recording submission
  const handleAudioSubmit = async () => {
    if (!recordedAudioUrl) {
      setError('No audio recorded');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Fetch the audio blob from the URL
      const response = await fetch(recordedAudioUrl);
      const audioBlob = await response.blob();

      // Upload the audio file using the service
      const fileInfo = await handleAudioFileUpload(audioBlob);
      console.log('Audio uploaded successfully:', fileInfo);

      // For audio answers, we only need to pass the object_name as the answer
      // The folder is included in the task type
      console.log('Audio file uploaded successfully, submitting object_name as answer:', fileInfo.object_name);
      await submitAnswer(fileInfo.object_name);

    } catch (err) {
      console.error('Error submitting audio:', err);
      setError('Failed to submit audio recording');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generic submit answer function
  const submitAnswer = async (answer: any) => {
    // Get the task ID from either id or _id field
    const taskId = task.id || task._id;

    if (!user || !taskId) {
      console.error('Cannot submit answer: user or taskId is missing', {
        user: !!user,
        taskId,
        task_id: task.id,
        task_id_underscore: task._id
      });
      return;
    }

    try {
      console.log(`Submitting answer for task ${taskId} (${task.type}):`, answer);
      setIsSubmitting(true);
      setError(null);

      // For audio tasks, we need to include the folder in the request
      let finalAnswer = answer;

      // If this is a speak_word task and the answer is a string (object_name),
      // we need to include the folder information
      if (task.type === 'speak_word' && typeof answer === 'string') {
        finalAnswer = {
          object_name: answer,
          folder: 'recordings'  // Default folder for audio recordings
        };
        console.log('Submitting audio answer with folder:', finalAnswer);
      }

      const result = await submitTaskAnswer(
        taskId,
        finalAnswer,
        user,
        task.type
      );

      console.log('Submission result:', result);
      setSubmissionResult(result);

      // Notify parent component
      if (onAnswerSubmitted) {
        onAnswerSubmitted(taskId, result.is_correct || false);
      }

      // Move to next task after a delay
      if (onNext) {
        setTimeout(() => {
          onNext();
        }, 1000);
      }

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render based on task type
  const renderTaskContent = () => {
    switch (task.type) {
      case 'single_choice':
      case 'multiple_choice':
        return renderChoiceTask();
      case 'image_identification':
        return renderImageIdentificationTask();
      case 'speak_word':
        return renderSpeakWordTask();
      case 'answer_in_word':
        return renderAnswerInWordTask();
      default:
        return (
          <div className="p-4 bg-yellow-100 rounded-lg">
            <p>Unknown task type: {task.type}</p>
          </div>
        );
    }
  };

  // Render answer in word task (text input for Devanagari)
  const renderAnswerInWordTask = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{task.question || 'Type your answer:'}</h3>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            Answer in Word
          </span>
        </div>

        {task.audio_hint_url && (
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Listen to the audio:</h4>
            <audio controls className="w-full">
              <source src={task.audio_hint_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 text-sm text-gray-600">
            <p>Hint: Type in Devanagari script (नेपाली)</p>
            <p className="mt-1 text-xs">You can use Google Input Tools or your system's Nepali keyboard</p>
          </div>
          <input
            type="text"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Type your answer here..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-4 flex justify-center">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
            onClick={async () => {
              if (isSubmitting || !textAnswer.trim()) return;
              await submitAnswer(textAnswer.trim());
            }}
            disabled={isSubmitting || !textAnswer.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {submissionResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            submissionResult.is_correct
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {submissionResult.is_correct
              ? 'Correct!'
              : `Incorrect. ${submissionResult.feedback || ''}`}
          </div>
        )}
      </div>
    );
  };

  // Render choice task (single or multiple)
  const renderChoiceTask = () => {
    const isMultiple = task.type === 'multiple_choice';

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{task.question}</h3>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            {isMultiple ? 'Multiple Choice' : 'Single Choice'}
          </span>
        </div>

        <div className="space-y-3">
          {task.options?.map((option, index) => (
            <button
              key={index}
              className={`w-full text-left p-3 border rounded-lg transition-colors ${
                selectedOptions.includes(option)
                  ? 'bg-purple-100 border-purple-500'
                  : 'hover:bg-purple-50'
              }`}
              onClick={() => isMultiple
                ? handleMultipleChoiceSelect(option)
                : handleSingleChoiceSelect(option)
              }
              disabled={isSubmitting}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
            onClick={isMultiple ? handleMultipleChoiceSubmit : handleSingleChoiceSubmit}
            disabled={isSubmitting || selectedOptions.length === 0}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {submissionResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            submissionResult.is_correct
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {submissionResult.is_correct
              ? 'Correct!'
              : `Incorrect. ${submissionResult.feedback || ''}`}
          </div>
        )}
      </div>
    );
  };

  // Render image identification task
  const renderImageIdentificationTask = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{task.question}</h3>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            Image Identification
          </span>
        </div>

        {task.image_url && (
          <div className="mb-6">
            <img
              src={task.image_url}
              alt="Identification task"
              className="max-w-full h-auto rounded-lg mx-auto border border-gray-200 shadow-sm"
            />
          </div>
        )}

        <div className="space-y-3">
          {task.options?.map((option, index) => (
            <button
              key={index}
              className={`w-full text-left p-3 border rounded-lg transition-colors ${
                selectedOptions.includes(option)
                  ? 'bg-purple-100 border-purple-500'
                  : 'hover:bg-purple-50'
              }`}
              onClick={() => handleSingleChoiceSelect(option)}
              disabled={isSubmitting}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
            onClick={handleSingleChoiceSubmit}
            disabled={isSubmitting || selectedOptions.length === 0}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {submissionResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            submissionResult.is_correct
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {submissionResult.is_correct
              ? 'Correct!'
              : `Incorrect. ${submissionResult.feedback || ''}`}
          </div>
        )}
      </div>
    );
  };

  // Render speak word task
  const renderSpeakWordTask = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">Speak this word:</h3>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            Speak Word
          </span>
        </div>
        <div className="text-3xl font-bold text-center p-6 mb-4 bg-purple-50 rounded-lg">
          {task.word}
        </div>

        {task.audio_hint_url && (
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Listen to pronunciation:</h4>
            <audio controls className="w-full">
              <source src={task.audio_hint_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="mt-6">
          {!isRecording && !recordedAudioUrl && (
            <button
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors w-full"
              onClick={startRecording}
              disabled={isSubmitting}
            >
              Start Recording
            </button>
          )}

          {isRecording && (
            <button
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors w-full"
              onClick={stopRecording}
            >
              Stop Recording
            </button>
          )}

          {recordedAudioUrl && (
            <div className="space-y-4">
              <audio ref={audioRef} controls className="w-full">
                <source src={recordedAudioUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>

              <div className="flex space-x-2 justify-center">
                <button
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex-1"
                  onClick={handleAudioSubmit}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting || isUploading ? 'Submitting...' : 'Submit Recording'}
                </button>

                <button
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  onClick={() => {
                    startRecording();
                  }}
                  disabled={isSubmitting || isUploading}
                >
                  Record Again
                </button>
              </div>

              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {submissionResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            submissionResult.is_correct
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {submissionResult.is_correct
              ? 'Correct pronunciation!'
              : `Needs improvement. ${submissionResult.feedback || ''}`}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="task-item">
      {/* Score indicator */}
      {score !== undefined && (
        <div className="mb-3 flex justify-end">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              score > 0 ? 'bg-green-500' : 'bg-gray-300'
            }`}></span>
            <span>Score: {score} pt</span>
          </div>
        </div>
      )}

      {renderTaskContent()}
    </div>
  );
};

export default TaskItem;
