import { useState, useRef, useCallback, useEffect } from 'react';

// WebSocket status types
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ProcessingStatus = 'recording_received' | 'verifying' | 'processing' | 'completed' | 'recording_cancelled' | null;

// Interface for WebSocket status messages
export interface WebSocketStatusMessage {
  type: 'status';
  status: string;
}

interface UseAudioWebSocketOptions {
  token: string | null;
  apiUrl?: string;
  onStatusChange?: (status: ProcessingStatus) => void;
}

/**
 * Hook for managing WebSocket connection for audio streaming
 */
export function useAudioWebSocket({
  token,
  apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/v1",
  onStatusChange
}: UseAudioWebSocketOptions) {
  // WebSocket connection status
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(null);

  // WebSocket reference
  const webSocketRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!token) {
      console.error('User not authenticated');
      return null;
    }

    // Close existing connection if any
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.close();
    }

    setWsStatus('connecting');

    // Create WebSocket connection
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/stream/audio?token=${token}`);

    // Set up event handlers
    ws.onopen = () => {
      console.log('WebSocket connection established');
      // Wait for server to send "connected" status
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'status') {
          // Handle different status messages from server
          switch (data.status) {
            case 'connected':
              console.log('Server authenticated user and is ready');
              setWsStatus('connected');
              break;

            case 'recording_received':
              console.log('Server received the recording');
              setProcessingStatus('recording_received');
              if (onStatusChange) onStatusChange('recording_received');
              break;

            case 'verifying':
              console.log('Server is verifying the recording');
              setProcessingStatus('verifying');
              if (onStatusChange) onStatusChange('verifying');
              break;

            case 'processing':
              console.log('Server is processing the recording');
              setProcessingStatus('processing');
              if (onStatusChange) onStatusChange('processing');
              break;

            case 'completed':
              console.log('Server completed processing the recording');
              setProcessingStatus('completed');
              if (onStatusChange) onStatusChange('completed');
              break;

            case 'recording_cancelled':
              console.log('Server confirmed recording cancellation');
              setProcessingStatus('recording_cancelled');
              if (onStatusChange) onStatusChange('recording_cancelled');
              break;

            default:
              console.log(`Received status: ${data.status}`);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWsStatus('disconnected');
    };

    webSocketRef.current = ws;
    return ws;
  }, [token, apiUrl, onStatusChange]);

  // Send audio chunk to WebSocket
  const sendAudioChunk = useCallback((chunk: Blob): void => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        webSocketRef.current.send(chunk);
        console.log(`Successfully sent audio chunk of size: ${chunk.size} bytes`);
      } catch (error) {
        console.error('Error sending audio chunk:', error);
      }
    } else {
      console.warn(`WebSocket not connected (state: ${webSocketRef.current?.readyState}), cannot send audio chunk`);
    }
  }, []);

  // Send status message to WebSocket
  const sendStatusMessage = useCallback((status: string): void => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        const message: WebSocketStatusMessage = {
          type: 'status',
          status: status
        };
        webSocketRef.current.send(JSON.stringify(message));
        console.log(`Successfully sent status message: ${status}`);
      } catch (error) {
        console.error(`Error sending status message (${status}):`, error);
      }
    } else {
      console.warn(`WebSocket not connected (state: ${webSocketRef.current?.readyState}), cannot send status: ${status}`);
    }
  }, []);

  // Send recording completed message
  const sendRecordingCompleted = useCallback((): void => {
    sendStatusMessage('recording_completed');
  }, [sendStatusMessage]);

  // Send recording cancelled message
  const sendRecordingCancelled = useCallback((): void => {
    sendStatusMessage('recording_cancelled');
  }, [sendStatusMessage]);

  // Send recording end message and close connection
  const closeConnection = useCallback((): void => {
    if (webSocketRef.current) {
      // Send recording_end status message to tell server to close the connection
      sendStatusMessage('recording_end');

      // Give the server a moment to process the message before closing
      setTimeout(() => {
        if (webSocketRef.current) {
          webSocketRef.current.close();
          webSocketRef.current = null;
          setWsStatus('disconnected');
        }
      }, 500);
    }
  }, [sendStatusMessage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
    };
  }, []);

  return {
    wsStatus,
    processingStatus,
    connectWebSocket,
    sendAudioChunk,
    sendStatusMessage,
    sendRecordingCompleted,
    sendRecordingCancelled,
    closeConnection
  };
}
