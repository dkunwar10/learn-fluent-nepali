
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './redux/store';
import Index from "./pages/Index";
import SlugLogin from "./pages/SlugLogin";
import DashboardPage from "./pages/DashboardPage";
import BeginLearningPage from "./pages/Learning/BeginLearningPage";
import TaskView from "./pages/Learning/TaskView";
import TaskPage from "./pages/Task/TaskPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <ReduxProvider store={store}>
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
              <Route path="/tasks/:taskSetId" element={<TaskView />} />
              <Route path="/tasks" element={<TaskPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;
