import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Options for the useRecorder hook
 */
interface UseRecorderOptions {
  /** Callback function that receives audio chunks as they become available */
  onDataAvailable?: (chunk: Blob) => void;
}

/**
 * Hook for recording audio with MediaRecorder API
 */
export const useRecorder = ({ onDataAvailable }: UseRecorderOptions = {}) => {
  // State
  const [recording, setRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * Check if browser supports audio recording
   */
  const checkBrowserCompatibility = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  /**
   * Start audio recording
   */
  const startRecording = useCallback(async () => {
    if (recording) return;

    // Check compatibility
    if (!checkBrowserCompatibility()) {
      setError("Your browser doesn't support audio recording");
      return;
    }

    // Reset state
    setAudioUrl(null);
    setError(null);
    audioChunksRef.current = [];

    try {
      // Get microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);

      // Set up media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          if (onDataAvailable) {
            onDataAvailable(event.data);
          }
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          setError("No audio data recorded");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      // Handle recording errors
      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error}`);
        stopRecording();
      };

      // Start recording with 250ms chunks for smoother visualization
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) {
      setError(err.message || 'Failed to start recording');
    }
  }, [recording, checkBrowserCompatibility, onDataAvailable]);

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(() => {
    if (!recording || !mediaRecorderRef.current) return;

    try {
      // Request final data chunk
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (err) {
          setError('Error requesting final data chunk');
        }
      }

      // Stop recorder after a small delay
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setRecording(false);

        // Stop audio tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to stop recording');
    }
  }, [recording, stream]);

  /**
   * Cancel audio recording
   */
  const cancelRecording = useCallback(() => {
    if (!recording || !mediaRecorderRef.current) return;

    try {
      // Stop recorder
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);

      // Clear state
      setAudioUrl(null);
      audioChunksRef.current = [];

      // Stop audio tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel recording');
    }
  }, [recording, stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop audio tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Stop recorder
      if (mediaRecorderRef.current && recording) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (err) {
          // Ignore cleanup errors
        }
      }

      // Release object URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stream, recording, audioUrl]);

  return {
    recording,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
};