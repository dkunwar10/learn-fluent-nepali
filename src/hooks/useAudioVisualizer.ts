import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Options for the audio visualizer hook
 */
interface AudioVisualizerOptions {
  /** FFT size for analyzer (power of 2) */
  fftSize?: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant?: number;
  /** Minimum decibels for analyzer */
  minDecibels?: number;
  /** Maximum decibels for analyzer */
  maxDecibels?: number;
}

/**
 * Hook for visualizing audio data from streams or elements
 */
export function useAudioVisualizer({
  fftSize = 2048,
  smoothingTimeConstant = 0.8,
  minDecibels = -100,
  maxDecibels = -30,
}: AudioVisualizerOptions = {}) {
  // State for visualization data
  const [visualizerData, setVisualizerData] = useState<number[]>([]);
  const [isVisualizing, setIsVisualizing] = useState(false);

  // Refs for audio context and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Initialize audio context and analyzer
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyzer node
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = fftSize;
      analyzer.smoothingTimeConstant = smoothingTimeConstant;
      analyzer.minDecibels = minDecibels;
      analyzer.maxDecibels = maxDecibels;
      analyzerRef.current = analyzer;
    }
  }, [fftSize, smoothingTimeConstant, minDecibels, maxDecibels]);

  // Visualize audio from a media stream
  const visualizeStream = useCallback((stream: MediaStream) => {
    try {
      // Initialize audio context and analyzer
      initializeAudio();
      
      if (!audioContextRef.current || !analyzerRef.current) {
        console.error('Audio context or analyzer not initialized');
        return;
      }
      
      // Create source from stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      sourceRef.current = source;
      
      // Start visualization loop
      startVisualizationLoop();
    } catch (error) {
      console.error('Error visualizing stream:', error);
    }
  }, [initializeAudio]);

  // Visualize audio from an HTML audio element
  const visualizeElement = useCallback((element: HTMLAudioElement) => {
    try {
      // Initialize audio context and analyzer
      initializeAudio();
      
      if (!audioContextRef.current || !analyzerRef.current) {
        console.error('Audio context or analyzer not initialized');
        return;
      }
      
      // Create source from element
      const source = audioContextRef.current.createMediaElementSource(element);
      source.connect(analyzerRef.current);
      analyzerRef.current.connect(audioContextRef.current.destination);
      sourceRef.current = source;
      
      // Start visualization loop
      startVisualizationLoop();
    } catch (error) {
      console.error('Error visualizing element:', error);
    }
  }, [initializeAudio]);

  // Start visualization loop
  const startVisualizationLoop = useCallback(() => {
    if (!analyzerRef.current) return;
    
    setIsVisualizing(true);
    
    // Create data array for frequency data
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Animation loop
    const loop = () => {
      if (!analyzerRef.current) return;
      
      // Get frequency data
      analyzerRef.current.getByteFrequencyData(dataArray);
      
      // Process data for visualization (normalize to 0-1 range)
      const normalizedData = Array.from(dataArray)
        .slice(0, 64) // Use fewer bars for better visualization
        .map(value => value / 255);
      
      // Update state
      setVisualizerData(normalizedData);
      
      // Continue loop
      rafIdRef.current = requestAnimationFrame(loop);
    };
    
    // Start loop
    loop();
  }, []);

  // Stop visualization
  const stopVisualization = useCallback(() => {
    // Cancel animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    // Reset state
    setIsVisualizing(false);
    setVisualizerData([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop visualization
      stopVisualization();
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [stopVisualization]);

  return {
    visualizerData,
    isVisualizing,
    visualizeStream,
    visualizeElement,
    stopVisualization,
  };
}
