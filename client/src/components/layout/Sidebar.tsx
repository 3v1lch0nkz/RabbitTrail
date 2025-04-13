import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ownedProjects: Project[];
  sharedProjects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  openCreateProjectModal: () => void;
  openProjectSettingsModal: () => void;
  isLoading: boolean;
}

export default function Sidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  selectedProject,
  selectProject,
  openCreateProjectModal,
  openProjectSettingsModal,
  isLoading
}: SidebarProps) {
  return (
    <aside 
      className={`w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto fixed inset-y-0 left-0 z-40 
                 lg:relative lg:z-0 transition-transform duration-300 transform 
                 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="p-4">
        <div className="flex justify-between items-center lg:hidden mb-2">
          <h2 className="font-semibold text-gray-900">Projects</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <h2 className="font-semibold text-gray-900 mb-4">My Projects</h2>
        
        <Button
          onClick={openCreateProjectModal}
          className="w-full mb-4"
          size="sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {ownedProjects.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No projects yet. Create your first one!
              </p>
            ) : (
              ownedProjects.map((project) => (
                <div 
                  key={project.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
                    selectedProject?.id === project.id 
                      ? 'bg-indigo-50' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => selectProject(project)}
                >
                  <div className="truncate">
                    <span className={`text-sm font-medium ${
                      selectedProject?.id === project.id 
                        ? 'text-primary' 
                        : 'text-gray-900'
                    }`}>
                      {project.title}
                    </span>
                  </div>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectProject(project);
                      openProjectSettingsModal();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {sharedProjects.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Shared With Me</h2>
          <div className="space-y-1">
            {sharedProjects.map((project) => (
              <div 
                key={project.id}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
                  selectedProject?.id === project.id 
                    ? 'bg-indigo-50' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => selectProject(project)}
              >
                <div className="truncate">
                  <span className={`text-sm font-medium ${
                    selectedProject?.id === project.id 
                      ? 'text-primary' 
                      : 'text-gray-900'
                  }`}>
                    {project.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedProject && (
        <div className="border-t border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Project Settings</h2>
          <div className="space-y-2 text-sm">
            <button 
              onClick={openProjectSettingsModal}
              className="text-primary hover:underline w-full text-left"
            >
              Manage Project Settings
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
