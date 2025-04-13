import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ProjectCollaborator, 
  User, 
  Project 
} from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X, Copy, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser: User;
}

// Create schema for invitation form
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const ShareProjectModal = ({ 
  isOpen, 
  onClose, 
  project,
  currentUser 
}: ShareProjectModalProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Fetch collaborators
  const { data: collaborators = [], isLoading } = useQuery<(ProjectCollaborator & { user: User })[]>({
    queryKey: [`/api/projects/${project.id}/collaborators`],
    enabled: isOpen && !!project.id,
  });
  
  // Invite form
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "editor",
    },
  });
  
  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      await apiRequest("POST", `/api/projects/${project.id}/collaborators`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/collaborators`] });
      form.reset();
      toast({
        title: "Invitation sent",
        description: "User has been added to the project",
      });
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
      await apiRequest("DELETE", `/api/projects/${project.id}/collaborators/${userId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/collaborators`] });
      toast({
        title: "Collaborator removed",
        description: "User has been removed from the project",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: InviteFormValues) => {
    addCollaboratorMutation.mutate(data);
  };
  
  const copyShareLink = () => {
    // In a real app, generate a sharing link
    const shareLink = `https://rabbittrail.app/p/${project.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard",
    });
  };
  
  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .map(name => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.username.substring(0, 2).toUpperCase();
  };
  
  const isOwner = project.ownerId === currentUser.id;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Invite collaborators to work on your project
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite by email</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <Button 
                        type="submit" 
                        disabled={addCollaboratorMutation.isPending}
                      >
                        {addCollaboratorMutation.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="editor">Editor (can add/edit entries)</SelectItem>
                        <SelectItem value="viewer">Viewer (read-only access)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          
          <div className="mt-6">
            <FormLabel>Share link</FormLabel>
            <div className="flex gap-2 mt-1">
              <Input
                readOnly
                value={`https://rabbittrail.app/p/${project.id}`}
                className="bg-gray-50"
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={copyShareLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Project members</h4>
            <ul className="space-y-3">
              {/* Project owner */}
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback>{getUserInitials(currentUser)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser.displayName || currentUser.username} (You)
                    </p>
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">Owner</span>
              </li>
              
              {/* Collaborators */}
              {isLoading ? (
                <li className="py-2 text-center text-sm text-gray-500">Loading collaborators...</li>
              ) : collaborators.length === 0 ? (
                <li className="py-2 text-center text-sm text-gray-500">No collaborators yet</li>
              ) : (
                collaborators.map((collab) => (
                  <li key={collab.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback>{getUserInitials(collab.user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {collab.user.displayName || collab.user.username}
                        </p>
                        <p className="text-xs text-gray-500">{collab.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={collab.role} disabled={!isOwner}>
                        <SelectTrigger className="h-8 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                          onClick={() => removeCollaboratorMutation.mutate(collab.userId)}
                          disabled={removeCollaboratorMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProjectModal;
