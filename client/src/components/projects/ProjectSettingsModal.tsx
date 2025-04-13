import { useState, useEffect } from "react";
import { Project, ProjectCollaborator } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";

interface ProjectSettingsModalProps {
  project: Project;
  onClose: () => void;
}

interface CollaboratorWithUser extends ProjectCollaborator {
  user: {
    id: number;
    displayName: string;
    email: string;
  };
}

export default function ProjectSettingsModal({ project, onClose }: ProjectSettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isPublicLinkEnabled, setIsPublicLinkEnabled] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Fetch collaborators
  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery<CollaboratorWithUser[]>({
    queryKey: ["/api/projects", project.id, "collaborators"],
    onError: (error: Error) => {
      toast({
        title: "Failed to load collaborators",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if current user is the owner
  useEffect(() => {
    if (collaborators && user) {
      const currentUserCollaborator = collaborators.find(collab => collab.userId === user.id);
      setIsOwner(currentUserCollaborator?.role === 'owner');
    }
  }, [collaborators, user]);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title,
        description,
      };
      await apiRequest("PUT", `/api/projects/${project.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Project updated",
        description: "Project settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${project.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async () => {
      if (!inviteEmail) {
        throw new Error("Email is required");
      }
      
      const data = {
        email: inviteEmail,
        role: "collaborator",
      };
      
      await apiRequest("POST", `/api/projects/${project.id}/collaborators`, data);
    },
    onSuccess: () => {
      toast({
        title: "Collaborator added",
        description: "The collaborator has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "collaborators"] });
      setInviteEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/projects/${project.id}/collaborators/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Collaborator removed",
        description: "The collaborator has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "collaborators"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update collaborator role mutation
  const updateCollaboratorRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("PUT", `/api/projects/${project.id}/collaborators/${userId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The collaborator's role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "collaborators"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    addCollaboratorMutation.mutate();
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Project Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            <form id="project-settings-form" onSubmit={handleUpdateProject}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isOwner}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    rows={3}
                    placeholder="Add a brief description of this project..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Collaborators</h3>
                  {isLoadingCollaborators ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {collaborators?.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-primary">
                              {collaborator.user.displayName.charAt(0).toUpperCase()}
                            </span>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {collaborator.user.displayName}
                                {collaborator.userId === user?.id && " (You)"}
                              </p>
                              <p className="text-xs text-gray-500">{collaborator.user.email}</p>
                            </div>
                          </div>
                          
                          {collaborator.role === 'owner' ? (
                            <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">Owner</span>
                          ) : (
                            <div className="flex items-center">
                              {isOwner && (
                                <>
                                  <select
                                    className="text-xs border-gray-300 rounded-md mr-2"
                                    value={collaborator.role}
                                    onChange={(e) => updateCollaboratorRoleMutation.mutate({
                                      userId: collaborator.userId,
                                      role: e.target.value
                                    })}
                                    disabled={updateCollaboratorRoleMutation.isPending}
                                  >
                                    <option value="collaborator">Collaborator</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                  <button
                                    className="text-gray-400 hover:text-red-600"
                                    onClick={() => removeCollaboratorMutation.mutate(collaborator.userId)}
                                    disabled={removeCollaboratorMutation.isPending}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {!isOwner && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  {collaborator.role === 'collaborator' ? 'Collaborator' : 'Viewer'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {isOwner && (
                    <div className="mt-4">
                      <form onSubmit={handleAddCollaborator}>
                        <Label htmlFor="invite-email">Invite Collaborator</Label>
                        <div className="flex mt-1">
                          <Input
                            type="email"
                            id="invite-email"
                            placeholder="Enter email address"
                            className="rounded-r-none"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                          />
                          <Button
                            type="submit"
                            className="rounded-l-none"
                            disabled={addCollaboratorMutation.isPending || !inviteEmail}
                          >
                            {addCollaboratorMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Invite"
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
                
                {isOwner && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Sharing</h3>
                      <div className="rounded-md bg-gray-50 p-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              id="public-link"
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              checked={isPublicLinkEnabled}
                              onChange={(e) => setIsPublicLinkEnabled(e.target.checked)}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="public-link" className="font-medium text-gray-700">Enable public view link</label>
                            <p className="text-gray-500">Anyone with the link can view this project but not edit it.</p>
                          </div>
                        </div>
                        
                        {isPublicLinkEnabled && (
                          <div className="mt-4 flex">
                            <Input
                              type="text"
                              readOnly
                              value={`https://rabbittrail.example.com/p/${project.id}-${encodeURIComponent(project.title.toLowerCase().replace(/\s+/g, '-'))}`}
                              className="rounded-r-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-l-none"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://rabbittrail.example.com/p/${project.id}-${encodeURIComponent(project.title.toLowerCase().replace(/\s+/g, '-'))}`);
                                toast({
                                  title: "Link copied",
                                  description: "The public link has been copied to your clipboard.",
                                });
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h3>
                      {confirmDelete ? (
                        <div className="flex flex-col space-y-2">
                          <p className="text-sm text-gray-600 mb-2">
                            Are you sure? This action cannot be undone. All entries and collaborator access will be permanently deleted.
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={() => setConfirmDelete(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => deleteProjectMutation.mutate()}
                              disabled={deleteProjectMutation.isPending}
                            >
                              {deleteProjectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                "Confirm Delete"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full"
                          onClick={() => setConfirmDelete(true)}
                        >
                          Delete Project
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="project-settings-form"
            disabled={updateProjectMutation.isPending || !isOwner || !title}
          >
            {updateProjectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
