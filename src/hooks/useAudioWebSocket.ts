import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * WebSocket connection status
 */
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Audio processing status from server
 */
export type ProcessingStatus = 'recording_received' | 'verifying' | 'processing' | 'completed' | 'recording_cancelled' | null;

/**
 * WebSocket status message interface
 */
export interface WebSocketStatusMessage {
  type: 'status';
  status: string;
  task_set_id?: string;
}

/**
 * Options for the useAudioWebSocket hook
 */
interface UseAudioWebSocketOptions {
  /** Authentication token */
  token: string | null;
  /** API URL */
  apiUrl?: string;
  /** Callback for status changes */
  onStatusChange?: (status: ProcessingStatus, taskSetId?: string) => void;
}

/**
 * Hook for managing WebSocket connection for audio streaming
 */
export function useAudioWebSocket({
  token,
  apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/v1",
  onStatusChange
}: UseAudioWebSocketOptions) {
  // State
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(null);

  // WebSocket reference
  const webSocketRef = useRef<WebSocket | null>(null);

  /**
   * Connect to WebSocket server
   */
  const connectWebSocket = useCallback(() => {
    if (!token) {
      console.error('Cannot connect WebSocket: No token provided');
      return null;
    }

    // Close existing connection
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.close();
    }

    setWsStatus('connecting');
    console.log('WebSocket connecting...');

    // Create WebSocket connection
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    const wsFullUrl = `${wsUrl}/ws/stream/audio?token=${token}`;
    console.log('WebSocket URL:', wsFullUrl.replace(token, 'TOKEN_HIDDEN'));
    const ws = new WebSocket(wsFullUrl);

    // Set up event handlers
    ws.onopen = () => {
      console.log('WebSocket connection opened');
      // Wait for server to send "connected" status
    };

    ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', data);

        if (data.type === 'status') {
          console.log('Status message received:', data.status);
          // Handle status messages
          switch (data.status) {
            case 'connected':
              console.log('WebSocket connected status received');
              setWsStatus('connected');
              break;

            case 'recording_received':
              console.log('Recording received status');
              setProcessingStatus('recording_received');
              if (onStatusChange) onStatusChange('recording_received');
              break;

            case 'verifying':
              console.log('Verifying status');
              setProcessingStatus('verifying');
              if (onStatusChange) onStatusChange('verifying');
              break;

            case 'processing':
              console.log('Processing status');
              setProcessingStatus('processing');
              if (onStatusChange) onStatusChange('processing');
              break;

            case 'completed':
              console.log('Completed status with task set ID:', data.task_set_id);
              setProcessingStatus('completed');
              if (onStatusChange) onStatusChange('completed', data.task_set_id);
              break;

            case 'recording_cancelled':
              console.log('Recording cancelled status');
              setProcessingStatus('recording_cancelled');
              if (onStatusChange) onStatusChange('recording_cancelled');
              break;
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

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setWsStatus('disconnected');
    };

    webSocketRef.current = ws;
    return ws;
  }, [token, apiUrl, onStatusChange]);

  /**
   * Send audio chunk to WebSocket
   */
  const sendAudioChunk = useCallback((chunk: Blob): void => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        webSocketRef.current.send(chunk);
      } catch (error) {
        // Ignore send errors
      }
    }
  }, []);

  /**
   * Send status message to WebSocket
   */
  const sendStatusMessage = useCallback((status: string): void => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        const message: WebSocketStatusMessage = {
          type: 'status',
          status: status
        };
        webSocketRef.current.send(JSON.stringify(message));
      } catch (error) {
        // Ignore send errors
      }
    }
  }, []);

  /**
   * Send recording completed message
   */
  const sendRecordingCompleted = useCallback((): void => {
    sendStatusMessage('recording_completed');
  }, [sendStatusMessage]);

  /**
   * Send recording cancelled message
   */
  const sendRecordingCancelled = useCallback((): void => {
    sendStatusMessage('recording_cancelled');
  }, [sendStatusMessage]);

  /**
   * Close WebSocket connection
   */
  const closeConnection = useCallback((): void => {
    if (webSocketRef.current) {
      // Send recording_end status message
      sendStatusMessage('recording_end');

      // Close after a short delay
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
