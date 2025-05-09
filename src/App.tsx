
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SlugLogin from "./pages/SlugLogin";
import DashboardPage from "./pages/DashboardPage";
import BeginLearningPage from "./pages/Learning/BeginLearning.container";
import TaskView from "./pages/Learning/TaskView";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/:slug/login" element={<SlugLogin />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/begin-learning" element={<BeginLearningPage />} />
            <Route path="/begin-learning/task/:taskSetId" element={<TaskView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
