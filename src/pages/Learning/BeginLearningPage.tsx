import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';
import AudioRecorder from '@/components/AudioRecorder';

/**
 * Page component for Begin Learning
 */
const BeginLearningPage: React.FC = () => {
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <SideNavigation />
        <SidebarInset>
          <div className="flex flex-col h-screen">
            {/* Page header */}
            <div className="bg-white shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-nepali-red">Audio Recording</h1>
                  <p className="text-gray-500">Practice speaking with real-time audio recording</p>
                </div>
                <SidebarTrigger />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-grow container mx-auto p-6">
              <div className="max-w-2xl mx-auto">
                {taskSetId && (
                  <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
                    Recording processed successfully! Task Set ID: {taskSetId}
                  </div>
                )}

                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default BeginLearningPage;
