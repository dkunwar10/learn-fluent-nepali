
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TenantLogin from "@/components/TenantLogin";

const SlugLogin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, setTenantSlug } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (slug) {
      setTenantSlug(slug);
    }
    
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [slug, isAuthenticated, navigate, setTenantSlug]);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/3 flex items-center justify-center p-4 md:p-8 login-background">
        <TenantLogin initialSlug={slug || ""} />
      </div>
      
      {/* Right side - App Showcase */}
      <div className="w-full md:w-2/3 bg-gradient-to-br from-nepali-red to-nepali-orange p-8 flex flex-col justify-center items-center text-white">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Learn Fluent Nepali</h1>
          <div className="mb-8 animate-float">
            <svg className="w-32 h-32 mx-auto opacity-90" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M250 500L0 250L250 0L500 250L250 500Z" fill="white" fillOpacity="0.9" />
              <path d="M250 450L50 250L250 50L450 250L250 450Z" fill="#003893" />
              <path d="M250 400L100 250L250 100L400 250L250 400Z" fill="#DC143C" />
            </svg>
          </div>
          <p className="text-xl mb-6">Master Nepali language through interactive lessons, quizzes, and real-time practice.</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-white bg-opacity-10 rounded-lg">
              <h3 className="font-bold text-lg">Interactive Lessons</h3>
              <p className="text-sm mt-2">Learn with engaging, adaptive content</p>
            </div>
            <div className="p-4 bg-white bg-opacity-10 rounded-lg">
              <h3 className="font-bold text-lg">Speech Recognition</h3>
              <p className="text-sm mt-2">Practice pronunciation with feedback</p>
            </div>
            <div className="p-4 bg-white bg-opacity-10 rounded-lg">
              <h3 className="font-bold text-lg">Cultural Insights</h3>
              <p className="text-sm mt-2">Understand Nepali culture and customs</p>
            </div>
            <div className="p-4 bg-white bg-opacity-10 rounded-lg">
              <h3 className="font-bold text-lg">Progress Tracking</h3>
              <p className="text-sm mt-2">Monitor your learning journey</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlugLogin;
