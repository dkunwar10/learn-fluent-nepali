import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Options for the audio recorder hook
 */
interface AudioRecorderOptions {
  /** Time slice in milliseconds for ondataavailable callback */
  timeslice?: number;
  /** Whether to automatically stop recording after maxDuration */
  autoStop?: boolean;
  /** Maximum duration in seconds (0 for no limit) */
  maxDuration?: number;
  /** Callback when recording is complete */
  onRecordingComplete?: (blob: Blob) => void;
}

/**
 * Recording state enum
 */
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * Hook for recording audio with MediaRecorder API
 */
export function useAudioRecorder({
  timeslice = 1000,
  autoStop = true,
  maxDuration = 30,
  onRecordingComplete,
}: AudioRecorderOptions = {}) {
  // State for recording status
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Refs for MediaRecorder and timers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);

  // Clean up resources
  const cleanup = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder if active
    if (mediaRecorderRef.current && recordingState === RecordingState.RECORDING) {
      mediaRecorderRef.current.stop();
    }

    // Stop and release media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Reset state
    setRecordingState(RecordingState.IDLE);
    setIsRecording(false);
  }, [recordingState]);

  // Forward declaration for stopRecording
  let stopRecording: () => void;

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create new MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Set up data handler
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      // Set up stop handler
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setRecordingState(RecordingState.STOPPED);
        setIsRecording(false);

        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
      };

      // Start recording with timeslice
      mediaRecorder.start(timeslice);
      setIsRecording(true);
      setRecordingState(RecordingState.RECORDING);
      setAudioChunks([]);
      setAudioBlob(null);
      startTimeRef.current = Date.now();

      // Set up timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      // Set up auto-stop if enabled
      if (autoStop && maxDuration > 0) {
        setTimeout(() => {
          if (mediaRecorderRef.current && recordingState === RecordingState.RECORDING) {
            stopRecording();
          }
        }, maxDuration * 1000);
      }

      return stream;
    } catch (error) {
      console.error('Error starting recording:', error);
      return null;
    }
  }, [autoStop, maxDuration, onRecordingComplete, timeslice, recordingState]);

  // Stop recording function
  stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === RecordingState.RECORDING) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [recordingState]);

  // Cancel recording function
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === RecordingState.RECORDING) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setAudioBlob(null);
      setAudioChunks([]);
      setRecordingState(RecordingState.IDLE);
      setIsRecording(false);
    }
  }, [recordingState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    recordingState,
    recordingTime,
    audioBlob,
    audioChunks,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
