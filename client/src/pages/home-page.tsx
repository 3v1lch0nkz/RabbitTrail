import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Project, insertProjectSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/layout/header";
import ProjectSidebar from "@/components/layout/project-sidebar";
import MobileProjectsList from "@/components/layout/mobile-projects-list";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Create project schema with validation
const createProjectSchema = insertProjectSchema
  .pick({ title: true, description: true })
  .extend({
    title: z.string().min(1, "Title is required"),
  });

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

const HomePage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Fetch projects
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  // Create project form
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectFormValues) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json() as Project;
    },
    onSuccess: (newProject: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: `"${newProject.title}" has been created successfully`,
      });
      navigate(`/projects/${newProject.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: CreateProjectFormValues) => {
    createProjectMutation.mutate(data);
  };
  
  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Desktop sidebar */}
        <ProjectSidebar 
          projects={projects} 
          isLoading={isLoadingProjects}
          onAddProject={openCreateDialog}
        />
        
        {/* Mobile projects list */}
        <MobileProjectsList
          projects={projects}
          isLoading={isLoadingProjects}
          onAddProject={openCreateDialog}
        />
        
        {/* Welcome/Dashboard content - hidden on mobile when projects exist */}
        <main className={`flex-1 p-6 flex flex-col items-center justify-center ${projects.length > 0 ? 'hidden md:flex' : ''}`}>
          <div className="max-w-xl w-full text-center space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to RabbitTrail</h1>
            <p className="text-lg text-gray-600">
              Your collaborative, map-based platform for hobbyist investigators
            </p>
            
            {isLoadingProjects ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full mb-4">
                  <PlusCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create your first project</h2>
                <p className="text-gray-600 mb-6">
                  Start documenting your investigations by creating a new project
                </p>
                <Button onClick={openCreateDialog}>
                  Create a Project
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your projects</h2>
                <p className="text-gray-600 mb-6">
                  You have {projects.length} project{projects.length !== 1 ? 's' : ''}. 
                  Select a project to continue your investigation.
                </p>
                <Button onClick={openCreateDialog}>
                  Create a New Project
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <MobileNav />
      
      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
            <DialogDescription>
              Add a title and description for your investigation project
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Cold Case Investigation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this project is about..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description to help identify your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Creating...
                    </span>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
