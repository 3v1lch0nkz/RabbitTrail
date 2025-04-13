import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Project } from "@shared/schema";
import { Loader2, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProjectSidebarProps {
  projects: Project[];
  isLoading: boolean;
  onAddProject: () => void;
}

const ProjectSidebar = ({ projects, isLoading, onAddProject }: ProjectSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [, params] = useRoute("/projects/:id");
  const currentProjectId = params?.id ? parseInt(params.id) : null;
  
  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className="hidden md:block w-64 bg-white border-r border-gray-200 overflow-y-auto h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
          <button 
            className="text-primary hover:text-indigo-700"
            onClick={onAddProject}
            aria-label="Add project"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <nav className="mt-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p>No projects found</p>
            <button 
              className="mt-2 text-primary hover:text-indigo-700 text-sm"
              onClick={onAddProject}
            >
              Create your first project
            </button>
          </div>
        ) : (
          filteredProjects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <a 
                className={`block px-4 py-3 border-l-4 ${
                  currentProjectId === project.id 
                    ? 'border-primary bg-indigo-50' 
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span 
                    className={`font-medium ${
                      currentProjectId === project.id ? 'text-primary' : 'text-gray-700'
                    }`}
                  >
                    {project.title}
                  </span>
                  {/* Collaborator count would go here in a real app */}
                  <span className="text-xs text-gray-500">
                    {/* This would be calculated from collaborators in a real app */}
                    {Math.floor(Math.random() * 5) === 0 ? "just you" : `${Math.floor(Math.random() * 5) + 1} members`}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {project.description}
                  </p>
                )}
              </a>
            </Link>
          ))
        )}
      </nav>
    </aside>
  );
};

export default ProjectSidebar;
