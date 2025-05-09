
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, 
  Mic, 
  BarChart2, 
  Settings, 
  LogOut, 
  User,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SideNavigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Navigation items
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      name: 'Record Audio',
      path: '/begin-learning',
      icon: <Mic className="w-5 h-5" />
    },
    {
      name: 'Tasks',
      path: '/tasks',
      icon: <BarChart2 className="w-5 h-5" />
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link to="/dashboard" className="flex items-center">
          <h2 className="text-2xl font-bold text-nepali-red">Nepali App</h2>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors",
              location.pathname === item.path ? "bg-gray-100 text-nepali-red font-medium" : "text-gray-700"
            )}
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
            {location.pathname === item.path && (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-gray-200 rounded-full p-2">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {user?.username || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role || 'User'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default SideNavigation;
