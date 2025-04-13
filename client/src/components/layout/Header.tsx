import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Project } from "@shared/schema";
import ProjectSelector from "@/components/projects/ProjectSelector";
import { useLocation } from "wouter";
import { MapPin } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
  selectedProject: Project | null;
  projects: Project[];
  selectProject: (project: Project) => void;
}

export default function Header({ toggleSidebar, selectedProject, projects, selectProject }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsDropdownOpen(false);
  };

  const goToLogin = () => {
    setLocation('/auth');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 py-3 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="lg:hidden mr-2 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center">
          <MapPin className="text-primary h-5 w-5 mr-2" />
          <h1 className="text-xl font-bold text-primary">RabbitTrail</h1>
        </div>
      </div>
      
      {/* Project Selector */}
      <div className="hidden md:block mx-auto max-w-xs w-full">
        <ProjectSelector 
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={selectProject}
        />
      </div>
      
      {/* User Menu */}
      <div className="relative" ref={dropdownRef}>
        {user ? (
          <>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <span className="hidden md:inline-block text-sm font-medium text-gray-700">{user.displayName}</span>
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-primary">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                <div className="border-t border-gray-100"></div>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <button 
            onClick={goToLogin}
            className="bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium"
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
}
