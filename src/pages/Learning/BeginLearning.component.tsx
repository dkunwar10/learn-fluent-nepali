import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import WebSocketAudioRecorder from '../../components/WebSocketAudioRecorder';

const WebSocketRecordingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [taskSetId, setTaskSetId] = useState<string | undefined>(undefined);

  // Handle recording completion
  const handleRecordingComplete = (newTaskSetId?: string) => {
    if (newTaskSetId) {
      setTaskSetId(newTaskSetId);
      console.log(`Recording completed with task set ID: ${newTaskSetId}`);
      
      // Optionally navigate to a task view page
      // navigate(`/tasks/${newTaskSetId}`);
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg mb-4">You need to be logged in to use this feature.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Audio Recording with WebSocket</h1>
      
      {taskSetId && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
          Recording processed successfully! Task Set ID: {taskSetId}
        </div>
      )}
      
      <WebSocketAudioRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  );
};

export default WebSocketRecordingPage;
