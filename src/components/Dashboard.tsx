
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import SideNavigation from '@/components/Navigation/SideNavigation';
import { LogOut, Bell } from "lucide-react";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
                  <h1 className="text-2xl font-bold text-nepali-maroon">Dashboard</h1>
                  <p className="text-gray-500">Welcome back, {user?.username}!</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  </Button>

                  <div className="flex items-center">
                    <div className="mr-2 text-right hidden sm:block">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-nepali-red flex items-center justify-center text-white">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                  <SidebarTrigger />
                </div>
              </div>
            </div>

            {/* Page content */}
            <main className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-nepali-red bg-opacity-10 pb-2">
                    <CardTitle className="text-xl text-nepali-maroon">Begin Learning</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-gray-600">
                      Start your Nepali learning journey today. Practice speaking with our real-time audio recording.
                    </p>
                    <div className="mt-4">
                      <Button className="nepali-gradient text-white" onClick={() => navigate("/begin-learning")}>
                        Start Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-nepali-blue bg-opacity-10 pb-2">
                    <CardTitle className="text-xl text-nepali-blue">My Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-gray-600">
                      View your learning statistics and track your improvement over time.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="border-nepali-blue text-nepali-blue hover:bg-nepali-blue hover:text-white"
                        onClick={() => navigate("/progress")}
                      >
                        View Stats
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-purple-500 bg-opacity-10 pb-2">
                    <CardTitle className="text-xl text-purple-700">Task Sets</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-gray-600">
                      View and manage your task sets. Track your progress on various learning tasks.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="border-purple-500 text-purple-700 hover:bg-purple-500 hover:text-white"
                        onClick={() => navigate("/tasks")}
                      >
                        View Tasks
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
