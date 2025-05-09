import { useEffect, useRef, useState, useCallback } from 'react';

interface UseRecorderOptions {
  onDataAvailable?: (chunk: Blob) => void;
}

export const useRecorder = ({ onDataAvailable }: UseRecorderOptions = {}) => {
  const [recording, setRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Helper function to check browser compatibility
  const checkBrowserCompatibility = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const startRecording = async () => {
    if (recording) return;

    // Check compatibility first
    if (!checkBrowserCompatibility()) {
      setError("Your browser doesn't support audio recording");
      return;
    }

    // Clear previous recording
    setAudioUrl(null);
    setError(null);
    audioChunksRef.current = [];

    try {
      // Request microphone access with proper constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);

      // Create media recorder with proper mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Call the callback if provided
          if (onDataAvailable) {
            onDataAvailable(event.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          setError("No audio data recorded");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        setError(`Recording error: ${event.error}`);
        stopRecording();
      };

      // Start recording - get data every 250ms for smoother visualization
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;

    try {
      console.log('Stopping recording...');

      // Request data one last time to ensure we get the final chunk
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
          console.log('Requested final data chunk');
        } catch (err) {
          console.error('Error requesting final data chunk:', err);
        }
      }

      // Stop the recorder after a small delay to ensure the final chunk is processed
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          console.log('MediaRecorder stopped');
        }
        setRecording(false);

        // Stop all audio tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }, 100);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(err.message || 'Failed to stop recording');
    }
  };

  const cancelRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;

    try {
      // Stop the recorder but don't save the audio
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);

      // Clear the audio URL
      setAudioUrl(null);

      // Stop all audio tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Clear the chunks
      audioChunksRef.current = [];
    } catch (err) {
      console.error('Error canceling recording:', err);
      setError(err.message || 'Failed to cancel recording');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && recording) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }

      // Revoke object URL if it exists
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
}