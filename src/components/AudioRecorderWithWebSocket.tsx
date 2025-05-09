import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRecorder } from '../hooks/useAudioRecorder';
import { useAudioWebSocket, WebSocketStatus, ProcessingStatus } from '../hooks/useAudioWebSocket';

interface AudioRecorderWithWebSocketProps {
  token: string | null;
  onRecordingComplete?: (taskSetId?: string) => void;
}

const AudioRecorderWithWebSocket: React.FC<AudioRecorderWithWebSocketProps> = ({ 
  token,
  onRecordingComplete 
}) => {
  // Use the recorder hook
  const { 
    recording, 
    audioUrl, 
    startRecording: startRecorderHook, 
    stopRecording: stopRecorderHook,
    cancelRecording: cancelRecorderHook
  } = useRecorder();
  
  // State for tracking chunks to send to WebSocket
  const [isStreamingToServer, setIsStreamingToServer] = useState(false);
  const [taskSetId, setTaskSetId] = useState<string | undefined>(undefined);
  
  // Refs for audio handling
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Handle WebSocket status changes
  const handleStatusChange = useCallback((status: ProcessingStatus) => {
    if (status === 'completed') {
      // Extract task set ID from the response if available
      // This would need to be implemented based on your server response
      // For now, we'll just use a placeholder
      setTaskSetId('task-123');
      
      // Notify parent component if needed
      if (onRecordingComplete) {
        onRecordingComplete('task-123');
      }
    }
  }, [onRecordingComplete]);
  
  // Use the WebSocket hook
  const { 
    wsStatus, 
    processingStatus,
    connectWebSocket,
    sendAudioChunk,
    sendRecordingCompleted,
    sendRecordingCancelled,
    closeConnection
  } = useAudioWebSocket({ 
    token,
    onStatusChange: handleStatusChange
  });

  // Start recording with WebSocket
  const startRecordingWithWS = useCallback(async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      setIsStreamingToServer(false);
      setTaskSetId(undefined);
      
      // Connect to WebSocket first
      const ws = connectWebSocket();
      
      if (!ws) {
        console.error('Failed to connect WebSocket');
        return;
      }
      
      // Start recording
      await startRecorderHook();
      setIsStreamingToServer(true);
      
      // Set up interval to collect and send chunks
      chunkIntervalRef.current = setInterval(() => {
        if (audioChunksRef.current.length > 0) {
          // Send the latest chunk
          const latestChunk = audioChunksRef.current.pop();
          if (latestChunk) {
            sendAudioChunk(latestChunk);
          }
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording with WebSocket:', err);
    }
  }, [connectWebSocket, startRecorderHook, sendAudioChunk]);
  
  // Stop recording and send completion message
  const stopRecordingWithWS = useCallback(() => {
    // Stop the recorder
    stopRecorderHook();
    
    // Clear chunk sending interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    // Send any remaining chunks
    if (audioChunksRef.current.length > 0) {
      audioChunksRef.current.forEach(chunk => {
        sendAudioChunk(chunk);
      });
      audioChunksRef.current = [];
    }
    
    // Send recording completed message
    sendRecordingCompleted();
    setIsStreamingToServer(false);
  }, [stopRecorderHook, sendAudioChunk, sendRecordingCompleted]);
  
  // Cancel recording
  const cancelRecordingWithWS = useCallback(() => {
    // Cancel the recorder
    cancelRecorderHook();
    
    // Clear chunk sending interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    // Send recording cancelled message
    sendRecordingCancelled();
    setIsStreamingToServer(false);
    
    // Clear chunks
    audioChunksRef.current = [];
  }, [cancelRecorderHook, sendRecordingCancelled]);
  
  // Close WebSocket connection
  const closeWebSocketConnection = useCallback(() => {
    closeConnection();
    
    // Clear chunk sending interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    // Clear chunks
    audioChunksRef.current = [];
    setIsStreamingToServer(false);
  }, [closeConnection]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }
      closeConnection();
    };
  }, [closeConnection]);
  
  // Listen for audio chunks from the recorder
  // This would need to be implemented by modifying the recorder hook
  // For now, we'll just simulate it with a dummy implementation
  useEffect(() => {
    if (recording && isStreamingToServer) {
      // Simulate receiving chunks from the recorder
      const simulateChunk = () => {
        // In a real implementation, you would get these from the recorder
        const dummyChunk = new Blob(['audio data'], { type: 'audio/webm' });
        audioChunksRef.current.push(dummyChunk);
      };
      
      // Simulate receiving chunks every 500ms
      const interval = setInterval(simulateChunk, 500);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [recording, isStreamingToServer]);
  
  return {
    recording,
    audioUrl,
    wsStatus,
    processingStatus,
    taskSetId,
    startRecording: startRecordingWithWS,
    stopRecording: stopRecordingWithWS,
    cancelRecording: cancelRecordingWithWS,
    closeConnection: closeWebSocketConnection
  };
};

export default AudioRecorderWithWebSocket;
