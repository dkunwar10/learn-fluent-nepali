import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AudioRecorder from '@/components/AudioRecorder';

const BeginLearning: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [taskSetId, setTaskSetId] = useState<string | undefined>(undefined);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Handle recording completion
  const handleRecordingComplete = (newTaskSetId?: string) => {
    if (newTaskSetId) {
      setTaskSetId(newTaskSetId);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Audio Recording</h1>
      
      {taskSetId && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
          Recording processed successfully! Task Set ID: {taskSetId}
        </div>
      )}
      
      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  );
};

export default BeginLearning;
