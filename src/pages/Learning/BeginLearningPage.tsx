
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';
import AudioRecorder from '@/components/AudioRecorder';
import { toast } from '@/hooks/use-toast';
import { Mic, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Page component for Begin Learning
 */
const BeginLearningPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [taskSetId, setTaskSetId] = useState<string | undefined>(undefined);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }

    // Log authentication status for debugging
    console.log('Authentication status:', isAuthenticated);
    console.log('User token exists:', user?.token ? 'Yes' : 'No');
  }, [isAuthenticated, navigate, user]);

  // Handle recording completion
  const handleRecordingComplete = (newTaskSetId?: string) => {
    if (newTaskSetId) {
      setTaskSetId(newTaskSetId);
      toast({
        title: "Success",
        description: "Recording processed successfully!",
        variant: "default",
      });
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
                <div className="flex items-center gap-2">
                  <Mic className="h-6 w-6 text-nepali-red" />
                  <div>
                    <h1 className="text-2xl font-bold text-nepali-red">Audio Recording</h1>
                    <p className="text-gray-500">Practice speaking with real-time audio recording</p>
                  </div>
                </div>
                <SidebarTrigger />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-grow container mx-auto p-6">
              <div className="max-w-2xl mx-auto">
                {taskSetId && (
                  <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-center flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <p>Recording processed successfully! <span className="font-semibold">Task Set ID: {taskSetId}</span></p>
                  </div>
                )}

                {user?.token ? (
                  <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                ) : (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-semibold">Authentication Error</p>
                      <p>Please try logging out and logging back in.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default BeginLearningPage;
