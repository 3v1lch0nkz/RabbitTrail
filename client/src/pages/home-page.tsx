import { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MapView from "@/components/map/MapView";
import EntriesPanel from "@/components/entries/EntriesPanel";
import NewEntryModal from "@/components/entries/NewEntryModal";
import EntryDetailModal from "@/components/entries/EntryDetailModal";
import ProjectSettingsModal from "@/components/projects/ProjectSettingsModal";
import CreateProjectModal from "@/components/projects/CreateProjectModal";
import { useQuery } from "@tanstack/react-query";
import { Project, Entry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isEntryDetailModalOpen, setIsEntryDetailModalOpen] = useState(false);
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  
  // Fetch projects
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    onError: (error: Error) => {
      toast({
        title: "Failed to load projects",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch entries for selected project
  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/projects", selectedProject?.id, "entries"],
    queryFn: selectedProject ? undefined : () => [],
    enabled: !!selectedProject,
    onError: (error: Error) => {
      toast({
        title: "Failed to load entries",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const openNewEntryModal = () => {
    setIsNewEntryModalOpen(true);
  };
  
  const closeNewEntryModal = () => {
    setIsNewEntryModalOpen(false);
  };
  
  const openEntryDetailModal = (entry: Entry) => {
    setSelectedEntry(entry);
    setIsEntryDetailModalOpen(true);
  };
  
  const closeEntryDetailModal = () => {
    setIsEntryDetailModalOpen(false);
  };
  
  const openProjectSettingsModal = () => {
    setIsProjectSettingsModalOpen(true);
  };
  
  const closeProjectSettingsModal = () => {
    setIsProjectSettingsModalOpen(false);
  };
  
  const openCreateProjectModal = () => {
    setIsCreateProjectModalOpen(true);
  };
  
  const closeCreateProjectModal = () => {
    setIsCreateProjectModalOpen(false);
  };
  
  const selectProject = (project: Project) => {
    setSelectedProject(project);
  };

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 h-screen flex flex-col overflow-hidden">
      <Header 
        toggleSidebar={toggleSidebar}
        selectedProject={selectedProject}
        projects={projectsData?.owned || []}
        selectProject={selectProject}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={projectsData?.owned || []}
          sharedProjects={projectsData?.shared || []}
          selectedProject={selectedProject}
          selectProject={selectProject}
          openCreateProjectModal={openCreateProjectModal}
          openProjectSettingsModal={openProjectSettingsModal}
          isLoading={isLoadingProjects}
        />
        
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <MapView 
            entries={entries || []} 
            openNewEntryModal={openNewEntryModal}
            openEntryDetailModal={openEntryDetailModal}
            selectedProject={selectedProject}
            isLoading={isLoadingEntries}
          />
          
          <EntriesPanel 
            entries={entries || []} 
            openNewEntryModal={openNewEntryModal}
            openEntryDetailModal={openEntryDetailModal}
            isLoading={isLoadingEntries}
          />
          
          {/* Mobile Bottom Navigation */}
          <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-30">
            <button className="flex-1 py-3 text-center text-sm font-medium text-primary border-t-2 border-primary">
              <i className="fas fa-map-marker-alt block mx-auto mb-1"></i>
              Map
            </button>
            <button className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700">
              <i className="fas fa-list block mx-auto mb-1"></i>
              Entries
            </button>
            <button 
              className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
              onClick={() => setIsSidebarOpen(true)}
            >
              <i className="fas fa-folder block mx-auto mb-1"></i>
              Projects
            </button>
            <button 
              className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
              onClick={openProjectSettingsModal}
            >
              <i className="fas fa-cog block mx-auto mb-1"></i>
              Settings
            </button>
          </div>
        </main>
      </div>
      
      {isNewEntryModalOpen && (
        <NewEntryModal 
          onClose={closeNewEntryModal} 
          projectId={selectedProject?.id || 0} 
        />
      )}
      
      {isEntryDetailModalOpen && selectedEntry && (
        <EntryDetailModal 
          entry={selectedEntry} 
          onClose={closeEntryDetailModal} 
        />
      )}
      
      {isProjectSettingsModalOpen && selectedProject && (
        <ProjectSettingsModal 
          project={selectedProject} 
          onClose={closeProjectSettingsModal} 
        />
      )}
      
      {isCreateProjectModalOpen && (
        <CreateProjectModal 
          onClose={closeCreateProjectModal} 
        />
      )}
    </div>
  );
}
