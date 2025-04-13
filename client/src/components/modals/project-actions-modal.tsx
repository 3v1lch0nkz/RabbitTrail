import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Download, Archive, ArchiveRestore, Trash2, AlertCircle } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ProjectActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export default function ProjectActionsModal({
  isOpen,
  onClose,
  project,
}: ProjectActionsModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${project.id}/export`);
      return await res.json();
    },
    onSuccess: (data) => {
      // Create a JSON file for download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rabbittrail-project-${project.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Project exported successfully",
        description: "The project data has been downloaded as a JSON file.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = project.archived 
        ? `/api/projects/${project.id}/unarchive` 
        : `/api/projects/${project.id}/archive`;
      const res = await apiRequest("PATCH", endpoint);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      
      toast({
        title: project.archived ? "Project unarchived" : "Project archived",
        description: project.archived
          ? "The project is now active again"
          : "The project has been archived and will be hidden from the main list",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: project.archived ? "Unarchive failed" : "Archive failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${project.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project deleted",
        description: "The project and all its entries have been permanently deleted",
      });
      
      setShowDeleteConfirm(false);
      onClose();
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Dialog open={isOpen && !showDeleteConfirm} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Actions</DialogTitle>
            <DialogDescription>
              Manage your project with the following options
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="flex items-center justify-start gap-2"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? "Exporting..." : "Export Project Data"}
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-start gap-2"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {project.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {archiveMutation.isPending
                ? "Processing..."
                : project.archived
                ? "Unarchive Project"
                : "Archive Project"}
            </Button>
            
            <Button
              variant="destructive"
              className="flex items-center justify-start gap-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              "{project.title}" and all of its entries, media, and collaboration data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}