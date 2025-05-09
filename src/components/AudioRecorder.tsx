import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecorder } from '@/hooks/useAudioRecorder';
import { useAudioWebSocket, ProcessingStatus } from '@/hooks/useAudioWebSocket';
import { useAuth } from '@/context/AuthContext';

// Define animation keyframes for audio visualization
const animationStyles = `
  @keyframes pulse-slow {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.5); }
  }
  @keyframes pulse-medium {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.8); }
  }
  @keyframes pulse-fast {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(2); }
  }
  .animate-pulse-slow { animation: pulse-slow 2.5s infinite; }
  .animate-pulse-medium { animation: pulse-medium 1.8s infinite; }
  .animate-pulse-fast { animation: pulse-fast 1.2s infinite; }
`;

interface AudioRecorderProps {
  onRecordingComplete?: (taskSetId?: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for recording time
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isBufferingChunks, setIsBufferingChunks] = useState<boolean>(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferedChunksRef = useRef<Blob[]>([]);

  // Handle WebSocket status changes
  const handleStatusChange = useCallback((status: ProcessingStatus, taskSetId?: string) => {
    if (status === 'completed' && taskSetId) {
      if (onRecordingComplete) {
        onRecordingComplete(taskSetId);
      }

      // Navigate to task view
      setTimeout(() => {
        navigate(`/tasks/${taskSetId}`, { state: { from: 'learning' } });
      }, 1500);
    }
  }, [onRecordingComplete, navigate]);

  // Initialize WebSocket hook
  const {
    wsStatus,
    processingStatus,
    connectWebSocket,
    sendAudioChunk,
    sendRecordingCompleted,
    sendRecordingCancelled,
    closeConnection
  } = useAudioWebSocket({
    token: user?.token || null,
    onStatusChange: handleStatusChange
  });

  // Log user token for debugging
  useEffect(() => {
    console.log('AudioRecorder: User token exists:', user?.token ? 'Yes' : 'No');
  }, [user?.token]);

  // Handle audio chunks from recorder
  const handleAudioChunk = useCallback((chunk: Blob) => {
    if (wsStatus === 'connected') {
      sendAudioChunk(chunk);
    } else {
      bufferedChunksRef.current.push(chunk);
      setIsBufferingChunks(true);
    }
  }, [wsStatus, sendAudioChunk]);

  // Initialize recorder hook
  const {
    recording,
    audioUrl,
    error,
    startRecording: startRecorderHook,
    stopRecording: stopRecorderHook,
    cancelRecording: cancelRecorderHook
  } = useRecorder({
    onDataAvailable: handleAudioChunk
  });

  // Start recording with WebSocket
  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      console.log('User token:', user?.token ? 'Token exists' : 'No token');

      // Clear buffered chunks
      bufferedChunksRef.current = [];
      setIsBufferingChunks(false);

      // Start WebSocket and recording in parallel
      console.log('Connecting WebSocket...');
      connectWebSocket();

      console.log('Starting recorder hook...');
      await startRecorderHook();

      // Start timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('Recording started successfully');
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, [connectWebSocket, startRecorderHook, user?.token]);

  // Stop recording and send completion message
  const stopRecording = useCallback(() => {
    // Ensure WebSocket is connected
    if (wsStatus !== 'connected') {
      connectWebSocket();
    }

    // Stop recorder
    stopRecorderHook();

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Send completion message after a short delay
    setTimeout(() => {
      sendRecordingCompleted();
    }, 500);
  }, [stopRecorderHook, sendRecordingCompleted, wsStatus, connectWebSocket]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    // Cancel recorder
    cancelRecorderHook();

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Clear buffered chunks
    bufferedChunksRef.current = [];
    setIsBufferingChunks(false);

    // Send cancellation message
    if (wsStatus === 'connected') {
      sendRecordingCancelled();
    }
  }, [cancelRecorderHook, sendRecordingCancelled, wsStatus]);

  // Send buffered chunks when WebSocket connects
  useEffect(() => {
    if (wsStatus === 'connected' && isBufferingChunks && bufferedChunksRef.current.length > 0) {
      // Send all buffered chunks
      bufferedChunksRef.current.forEach(chunk => {
        sendAudioChunk(chunk);
      });

      // Clear buffer
      bufferedChunksRef.current = [];
      setIsBufferingChunks(false);
    }
  }, [wsStatus, isBufferingChunks, sendAudioChunk]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      closeConnection();
    };
  }, [closeConnection]);

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Animation styles */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* Header */}
      <div className="flex items-center w-full mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-purple-500 fill-current">
            <path d="M12 16a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4zm0-12a2 2 0 0 1 2 2v6a2 2 0 1 1-4 0V6a2 2 0 0 1 2-2z" />
            <path d="M19 12a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-1.08A7 7 0 0 0 19 12z" />
          </svg>
        </div>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-purple-500">Audio Recorder</h1>
          <p className="text-gray-600">Record and play audio</p>
        </div>

        {/* WebSocket status indicator */}
        <div className="ml-auto flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            wsStatus === 'connected' ? 'bg-green-500' :
            wsStatus === 'connecting' ? 'bg-yellow-500' :
            wsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-500">
            {wsStatus === 'connected' ? 'Connected' :
             wsStatus === 'connecting' ? 'Connecting...' :
             wsStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Processing status banner */}
      {processingStatus && (
        <div className="bg-blue-100 w-full p-3 rounded-lg mb-4 flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
          <span className="text-blue-700">
            {processingStatus === 'recording_received' && 'Recording received'}
            {processingStatus === 'verifying' && 'Verifying recording...'}
            {processingStatus === 'processing' && 'Processing recording...'}
            {processingStatus === 'completed' && 'Processing completed'}
            {processingStatus === 'recording_cancelled' && 'Recording cancelled'}
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="w-full border-2 border-dashed border-purple-300 rounded-lg p-6 flex flex-col items-center justify-center">
        {audioUrl ? (
          <div className="w-full">
            {/* Audio player */}
            <div className="flex items-center justify-center mb-4">
              <audio ref={audioRef} src={audioUrl} controls className="w-full" />
            </div>

            {/* Record new button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={startRecording}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Record New
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Recording UI */}
            {recording ? (
              <div className="flex flex-col items-center">
                <div className="text-xl font-bold text-purple-600 mb-4">Recording...</div>

                {/* Recording animation */}
                <div className="flex space-x-1 mb-4">
                  <div className="w-1 h-8 bg-purple-300 rounded-full animate-pulse-slow"></div>
                  <div className="w-1 h-16 bg-purple-400 rounded-full animate-pulse-medium"></div>
                  <div className="w-1 h-12 bg-purple-500 rounded-full animate-pulse-fast"></div>
                  <div className="w-1 h-20 bg-purple-600 rounded-full animate-pulse-medium"></div>
                  <div className="w-1 h-10 bg-purple-500 rounded-full animate-pulse-slow"></div>
                  <div className="w-1 h-14 bg-purple-400 rounded-full animate-pulse-fast"></div>
                  <div className="w-1 h-6 bg-purple-300 rounded-full animate-pulse-medium"></div>
                </div>

                {/* Recording time */}
                <div className="bg-purple-100 px-3 py-1 rounded-full mb-6">
                  <span className="text-purple-800 font-bold">{formatTime(recordingTime)}</span>
                </div>

                {/* Stop and cancel buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={stopRecording}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Stop & Save
                  </button>

                  <button
                    onClick={cancelRecording}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Start recording button */
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-medium mb-4">Ready to Record</h3>
                <button
                  onClick={startRecording}
                  className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center text-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Recording
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg w-full">
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
