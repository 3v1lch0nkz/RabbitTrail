import { useState, useEffect, useRef } from "react";
import { Project } from "@shared/schema";

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle project selection
  const handleSelectProject = (project: Project) => {
    onSelectProject(project);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        className="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm
                   focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
                   flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="truncate">
          {selectedProject ? selectedProject.title : "Select a project"}
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {projects.length === 0 ? (
            <div className="text-gray-500 px-4 py-2 text-sm">No projects available</div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  selectedProject?.id === project.id
                    ? 'text-white bg-primary'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectProject(project)}
              >
                <span className="block truncate">{project.title}</span>
                {selectedProject?.id === project.id && (
                  <span
                    className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                      selectedProject?.id === project.id ? 'text-white' : 'text-primary'
                    }`}
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
