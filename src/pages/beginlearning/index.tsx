import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import BeginLearning from "@/components/BeginLearning";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchUserTaskSets, TaskSet } from "@/api/taskService";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

const BeginLearningPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // State for task sets
  const [taskSets, setTaskSets] = useState<TaskSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: 10,
    skip: 0,
    total: 0,
    hasMore: false
  });

  // State for active view
  const [activeView, setActiveView] = useState<"learning" | "history">("learning");

  // Fetch user's task sets
  const fetchTaskSets = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const fields = ["id", "input_type", "input_content", "created_at", "status", "total_score"];
      const result = await fetchUserTaskSets(user, pagination.limit, pagination.skip, fields);

      setTaskSets(result.data);
      setPagination({
        limit: result.meta.limit,
        skip: result.meta.skip,
        total: result.meta.total,
        hasMore: result.meta.has_more
      });
    } catch (err) {
      console.error("Error fetching task sets:", err);
      setError("Failed to load your learning history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load task sets on component mount
  useEffect(() => {
    if (isAuthenticated && activeView === "history") {
      fetchTaskSets();
    }
  }, [isAuthenticated, activeView, pagination.skip]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        skip: prev.skip + prev.limit
      }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.skip > 0) {
      setPagination(prev => ({
        ...prev,
        skip: Math.max(0, prev.skip - prev.limit)
      }));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (err) {
      return "Unknown date";
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-nepali-maroon">Begin Learning</h1>
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "learning" | "history")}>
          <TabsList>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="learning" className="mt-0" hidden={activeView !== "learning"}>
        <BeginLearning />
      </TabsContent>

      <TabsContent value="history" className="mt-0" hidden={activeView !== "history"}>
        <Card>
          <CardHeader>
            <CardTitle>Your Learning History</CardTitle>
            <CardDescription>View your previous learning sessions and results</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-nepali-blue" />
                <p className="ml-2 text-gray-600">Loading your history...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => fetchTaskSets()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : taskSets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">You don't have any learning history yet.</p>
                <Button
                  className="mt-4"
                  onClick={() => setActiveView("learning")}
                >
                  Start Learning
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {taskSets.map((taskSet) => (
                  <motion.div
                    key={taskSet.id}
                    whileHover={{ scale: 1.01 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/beginlearning/task/${taskSet.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">
                          {taskSet.input_content
                            ? taskSet.input_content.substring(0, 50) + (taskSet.input_content.length > 50 ? '...' : '')
                            : 'Learning Session'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(taskSet.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(taskSet.status || '')}`}>
                          {taskSet.status || 'Unknown'}
                        </span>
                        {taskSet.total_score !== undefined && (
                          <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            Score: {taskSet.total_score}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="capitalize">{taskSet.input_type || 'Unknown'}</span> input
                    </div>
                  </motion.div>
                ))}

                {/* Pagination controls */}
                {taskSets.length > 0 && (
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-gray-500">
                      Showing {pagination.skip + 1}-{Math.min(pagination.skip + taskSets.length, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={pagination.skip === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
};

export default BeginLearningPage;
