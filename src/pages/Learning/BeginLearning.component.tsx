import React, { useState, useRef, useEffect } from 'react';

const AudioQuizGenie = () => {
  // State for recording and playback
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Refs for audio handling
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioRef = useRef(null);
  
  // Initialize audio context
  useEffect(() => {
    // Use only AudioContext (no need for webkitAudioContext)
    try {
      audioContextRef.current = new AudioContext();
    } catch (err) {
      console.error('Audio Context creation failed:', err);
    }
    
    // Cleanup function
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

  }, []);

  // Update current position during playback
  useEffect(() => {
    if (audioRef.current && audioURL) {
      const updatePosition = () => {
        setCurrentPosition(audioRef.current.currentTime);
        animationFrameRef.current = requestAnimationFrame(updatePosition);
      };
      
      animationFrameRef.current = requestAnimationFrame(updatePosition);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [audioURL]);

  // Start recording function
  const startRecording = async () => {
    try {
      // Reset states
      setWaveformData([]);
      setAudioURL(null);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Set up audio analysis for waveform visualization
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        
        // Configure analyser for waveform data
        analyser.fftSize = 256; // Smaller for better performance
        source.connect(analyser);
        analyserRef.current = analyser;
        
        // Start visualization
        visualizeAudio();
      }

      // Handle recorded audio chunks
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        
        // Stop microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      // Start recording
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Create heartbeat-like waveform visualization
  const visualizeAudio = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateWaveform = () => {
      // Get waveform data
      analyserRef.current.getByteTimeDomainData(dataArray);
      
      // Sample the data (fewer points for better performance)
      const sampleSize = 32; // Smaller number for simpler waveform
      const step = Math.floor(bufferLength / sampleSize);
      
      // Process the data into amplitude values
      const newData = [];
      for (let i = 0; i < bufferLength; i += step) {
        // Convert from 0-255 to -1 to 1 for waveform display
        const value = (dataArray[i] / 128.0) - 1;
        newData.push(value);
      }
      
      // Update waveform state with limited history
      setWaveformData(prevData => {
        const maxPoints = 300; // Keep fewer points for better performance
        const combined = [...prevData, ...newData];
        return combined.length > maxPoints ? combined.slice(-maxPoints) : combined;
      });
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };
    
    updateWaveform();
  };

  // Handle audio element loading
  const handleAudioLoad = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle seeking in the waveform
  const handleSeek = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekPosition = (x / rect.width) * duration;
    
    if (audioRef.current && seekPosition >= 0 && seekPosition <= duration) {
      audioRef.current.currentTime = seekPosition;
      setCurrentPosition(seekPosition);
    }
  };

  // Handle file upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setWaveformData([]); // Clear recording waveform data
    }
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render component
  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center w-full mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-purple-500 fill-current">
            <path d="M12 16a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4zm0-12a2 2 0 0 1 2 2v6a2 2 0 1 1-4 0V6a2 2 0 0 1 2-2z" />
            <path d="M19 12a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-1.08A7 7 0 0 0 19 12z" />
          </svg>
        </div>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-purple-500">Audio Quiz Genie</h1>
          <p className="text-gray-600">For kids learning Nepali language</p>
        </div>
        <div className="ml-auto">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Instruction banner */}
      <div className="bg-purple-100 w-full p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <div className="bg-purple-200 rounded-full p-2 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-purple-700">Record or upload a Nepali conversation for me to create a quiz!</p>
        </div>
      </div>

      {/* Main content area */}
      <div className="w-full border-2 border-dashed border-purple-300 rounded-lg p-6 flex flex-col items-center justify-center">
        {/* Show audio player and waveform if there's audio */}
        {audioURL ? (
          <div className="w-full">
            {/* Waveform visualization */}
            <div 
              className="w-full h-24 bg-gray-100 rounded mb-4 relative cursor-pointer"
              onClick={handleSeek}
            >
              {/* Heartbeat-style waveform */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-16 flex items-center">
                  {waveformData.length > 0 ? (
                    waveformData.map((value, index) => (
                      <div 
                        key={index}
                        className="w-1 mx-px bg-purple-500"
                        style={{ 
                          height: `${Math.abs(value) * 100}%`,
                          maxHeight: '100%'
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-gray-400">Waveform visualization</div>
                  )}
                </div>
              </div>
              
              {/* Playback position indicator */}
              {duration > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-purple-600"
                  style={{ left: `${(currentPosition / duration) * 100}%` }}
                />
              )}
            </div>
            
            {/* Audio player controls */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{formatTime(currentPosition)}</span>
              <audio 
                ref={audioRef}
                src={audioURL} 
                controls
                className="w-4/5"
                onLoadedMetadata={handleAudioLoad}
              />
              <span className="text-sm text-gray-600">{formatTime(duration)}</span>
            </div>
            
            {/* Record new button */}
            <div className="flex justify-center">
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
            {/* Upload UI when no audio is present */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-medium mb-2">Upload Audio File</h3>
            <p className="text-gray-500 text-center mb-6">Drag & drop an audio file here, or click to select</p>
            
            {/* Upload and record buttons */}
            <div className="flex space-x-4">
              <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Select File
                <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
              </label>
              
              {/* Toggle between record and stop buttons */}
              {!recording ? (
                <button 
                  onClick={startRecording}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Record Audio
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Recording
                </button>
              )}
            </div>
            
            {/* Live recording waveform */}
            {recording && (
              <div className="mt-6 w-full">
                <div className="w-full h-24 bg-gray-100 rounded relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-16 flex items-center">
                      {waveformData.map((value, index) => (
                        <div 
                          key={index}
                          className="w-1 mx-px bg-red-500"
                          style={{ 
                            height: `${Math.abs(value) * 100}%`,
                            maxHeight: '100%'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AudioQuizGenie;
