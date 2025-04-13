import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Project } from "@shared/schema";
import { Loader2, Search, Plus, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MobileProjectsListProps {
  projects: Project[];
  isLoading: boolean;
  onAddProject: () => void;
}

const MobileProjectsList = ({ projects, isLoading, onAddProject }: MobileProjectsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [, params] = useRoute("/projects/:id");
  const currentProjectId = params?.id ? parseInt(params.id) : null;
  
  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="md:hidden p-4 w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
          <Button onClick={onAddProject} size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>New</span>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {filteredProjects.length === 0 ? (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">No projects yet</CardTitle>
            <CardDescription>Create your first investigation project</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button onClick={onAddProject} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className={currentProjectId === project.id ? "border-primary shadow-sm" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-base font-medium">
                      {project.title}
                    </CardTitle>
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                  </div>
                  {project.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
          <div className="mt-4 flex justify-center">
            <Button onClick={onAddProject} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProjectsList;