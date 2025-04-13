import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Project, Entry, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Users, MoreVertical } from "lucide-react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import ProjectSidebar from "@/components/layout/project-sidebar";
import EntryList from "@/components/entries/entry-list";
import MapComponent from "@/components/map/map-component";
import NewEntryModal from "@/components/modals/new-entry-modal";
import ShareProjectModal from "@/components/modals/share-project-modal";
import ProjectActionsModal from "@/components/modals/project-actions-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ProjectPage = () => {
  const [match, params] = useRoute<{ id: string }>("/projects/:id");
  const { toast } = useToast();
  const { user } = useAuth();
  const projectId = parseInt(params?.id || "0");
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProjectActionsModalOpen, setIsProjectActionsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<Entry | undefined>(undefined);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  
  // Fetch project data
  const { 
    data: project, 
    isLoading: isLoadingProject,
    error: projectError
  } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  // Fetch entries for this project
  const { 
    data: entries = [], 
    isLoading: isLoadingEntries,
    error: entriesError
  } = useQuery<Entry[]>({
    queryKey: [`/api/projects/${projectId}/entries`],
    enabled: !!projectId,
  });
  
  // Fetch all projects (for sidebar)
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  // Fetch collaborators
  const {
    data: collaborators = []
  } = useQuery<User[]>({
    queryKey: [`/api/projects/${projectId}/collaborators`],
    enabled: !!projectId,
    // Transform the data to extract user objects
    select: (data: any[]) => {
      return data.map(collab => collab.user || collab);
    },
  });
  
  // Center map on first entry if available
  useEffect(() => {
    if (entries.length > 0 && entries[0].latitude && entries[0].longitude) {
      try {
        const lat = parseFloat(entries[0].latitude);
        const lng = parseFloat(entries[0].longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
        }
      } catch (e) {
        console.error("Error parsing coordinates:", e);
      }
    }
  }, [entries]);
  
  // Handle error states
  useEffect(() => {
    if (projectError) {
      toast({
        title: "Error loading project",
        description: "Could not load project details. Please try again later.",
        variant: "destructive",
      });
    }
    
    if (entriesError) {
      toast({
        title: "Error loading entries",
        description: "Could not load project entries. Please try again later.",
        variant: "destructive",
      });
    }
  }, [projectError, entriesError, toast]);
  
  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (entryData: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/entries`, entryData);
      return await res.json() as Entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/entries`] });
      toast({
        title: "Entry created",
        description: "Your entry has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/entries/${id}`, data);
      return await res.json() as Entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/entries`] });
      toast({
        title: "Entry updated",
        description: "Your entry has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/entries/${entryId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/entries`] });
      toast({
        title: "Entry deleted",
        description: "Entry has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateProject = () => {
    window.location.href = "/";
  };
  
  const handleAddEntry = () => {
    setEditingEntry(undefined);
    setIsNewEntryModalOpen(true);
  };
  
  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setIsNewEntryModalOpen(true);
  };
  
  const handleDeleteEntry = (entryId: number) => {
    deleteEntryMutation.mutate(entryId);
  };
  
  const handleEntrySubmit = (data: any) => {
    if (editingEntry) {
      updateEntryMutation.mutate({ id: editingEntry.id, data });
    } else {
      createEntryMutation.mutate(data);
    }
    setIsNewEntryModalOpen(false);
  };
  
  const handleMarkerClick = (entry: Entry) => {
    setSelectedEntry(entry);
    
    // Find and scroll to the corresponding entry in the list
    const entryElement = document.querySelector(`[data-entry-id="${entry.id}"]`);
    if (entryElement) {
      entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Open share project modal
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };
  
  // Open project actions modal
  const handleOpenProjectActionsModal = () => {
    setIsProjectActionsModalOpen(true);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <ProjectSidebar 
          projects={projects} 
          isLoading={isLoadingProjects}
          onAddProject={handleCreateProject}
        />
        
        {isLoadingProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : !project ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <h2 className="text-2xl font-bold mb-2">Project not found</h2>
              <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => window.location.href = "/"}>
                Back to Projects
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Map Section */}
            <div className="relative h-[calc(50vh-4rem)] md:h-auto md:flex-1 md:order-2">
              <MapComponent 
                entries={entries}
                onMarkerClick={handleMarkerClick}
                className="h-full"
                center={mapCenter}
              />
              
              {/* Add Entry Button (Mobile) */}
              <div className="md:hidden absolute bottom-4 right-4">
                <Button 
                  className="rounded-full w-14 h-14 shadow-lg p-0"
                  onClick={handleAddEntry}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </Button>
              </div>
            </div>
            
            {/* Entries Panel */}
            <div className="md:w-1/2 lg:w-2/5 bg-white border-t md:border-t-0 md:border-l border-gray-200 md:order-1 flex flex-col overflow-hidden">
              <EntryList 
                project={project}
                entries={entries}
                isLoading={isLoadingEntries}
                users={[...(collaborators || []), user!].filter(Boolean)}
                onAddEntry={handleAddEntry}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
                onProjectActions={handleOpenProjectActionsModal}
              />
              
              {/* Project Collaborators Section */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Collaborators</h3>
                  <button 
                    className="text-primary text-sm hover:text-indigo-700"
                    onClick={handleOpenShareModal}
                  >
                    + Add People
                  </button>
                </div>
                <div className="mt-2 flex -space-x-2 overflow-hidden">
                  {collaborators && collaborators.length > 0 ? (
                    collaborators.slice(0, 3).map((collaborator, index) => (
                      <div 
                        key={collaborator.id}
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center"
                      >
                        {collaborator.displayName?.charAt(0) || collaborator.username.charAt(0)}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Only you</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <MobileNav />
      
      {/* New Entry Modal */}
      {project && user && (
        <NewEntryModal 
          isOpen={isNewEntryModalOpen}
          onClose={() => setIsNewEntryModalOpen(false)}
          onSubmit={handleEntrySubmit}
          projectId={project.id}
          userId={user.id}
          editEntry={editingEntry}
        />
      )}
      
      {/* Share Project Modal */}
      {project && user && (
        <ShareProjectModal 
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          project={project}
          currentUser={user}
        />
      )}
      
      {/* Project Actions Modal */}
      {project && (
        <ProjectActionsModal 
          isOpen={isProjectActionsModalOpen}
          onClose={() => setIsProjectActionsModalOpen(false)}
          project={project}
        />
      )}
    </div>
  );
};

export default ProjectPage;
