
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-nepali-maroon">Nepali Learning Dashboard</h1>
        <Button onClick={handleLogout} variant="outline" className="border-nepali-red text-nepali-red hover:bg-nepali-red hover:text-white">
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-nepali-red bg-opacity-10 pb-2">
            <CardTitle className="text-xl text-nepali-maroon">Welcome, {user?.username}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-gray-600">
              Start your Nepali learning journey today. Access your lessons and track your progress.
            </p>
            <p className="text-gray-600">
              Try our real-time audio recording with WebSocket streaming technology.
            </p>
            <div className="mt-4">
              <Button className="nepali-gradient text-white" onClick={() => navigate("/begin-learning")}>Begin Learning</Button>
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
              <Button variant="outline" className="border-nepali-blue text-nepali-blue hover:bg-nepali-blue hover:text-white">
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
    </div>
  );
};

export default Dashboard;
