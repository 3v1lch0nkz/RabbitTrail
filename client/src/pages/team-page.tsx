import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { User, Project, ProjectCollaborator } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  Users, 
  User as UserIcon, 
  Mail, 
  Clock, 
  PenSquare, 
  Eye, 
  Shield 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const TeamPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("collaborations");

  // Fetch user's projects
  const { 
    data: projects = [], 
    isLoading: isProjectsLoading 
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch project collaborators for each project
  const { 
    data: collaborations = [], 
    isLoading: isCollaborationsLoading 
  } = useQuery<{ 
    project: Project; 
    collaborators: (ProjectCollaborator & { user: User })[] 
  }[]>({
    queryKey: ["/api/projects/collaborations"],
    queryFn: async () => {
      // For each project, get the collaborators
      const projectsWithCollaborators = await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetch(`/api/projects/${project.id}/collaborators`);
            if (!response.ok) throw new Error("Failed to fetch collaborators");
            const collaborators = await response.json();
            return { project, collaborators };
          } catch (error) {
            console.error(`Error fetching collaborators for project ${project.id}:`, error);
            return { project, collaborators: [] };
          }
        })
      );
      return projectsWithCollaborators;
    },
    enabled: projects.length > 0,
  });

  // Get only projects where current user is a collaborator (not owner)
  const projectsAsCollaborator = collaborations
    .filter(item => 
      item.collaborators.some(collab => 
        collab.userId === user?.id && item.project.ownerId !== user?.id
      )
    );

  // Get projects created by the current user
  const ownedProjects = projects.filter(project => project.ownerId === user?.id);
  
  // Get all team members (distinct)
  const allTeamMembers = new Map<number, User>();
  collaborations.forEach(item => {
    item.collaborators.forEach(collab => {
      if (collab.user.id !== user?.id) {
        allTeamMembers.set(collab.user.id, collab.user);
      }
    });
    // Also add the project owner if not the current user
    const ownerProject = projects.find(p => p.id === item.project.id);
    if (ownerProject && ownerProject.ownerId !== user?.id) {
      const ownerCollaborator = item.collaborators.find(c => c.userId === ownerProject.ownerId);
      if (ownerCollaborator) {
        allTeamMembers.set(ownerCollaborator.user.id, ownerCollaborator.user);
      }
    }
  });

  // Helper function to get user's initials
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

  // Get role label
  const getRoleLabel = (role: string) => {
    switch(role) {
      case "owner": return "Owner";
      case "editor": return "Editor";
      case "viewer": return "Viewer";
      default: return "Collaborator";
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch(role) {
      case "owner": return <Shield className="h-4 w-4" />;
      case "editor": return <PenSquare className="h-4 w-4" />;
      case "viewer": return <Eye className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  // Get timeframe label
  const getTimeAgo = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
        </div>
        
        <Tabs defaultValue="collaborations" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="collaborations">My Collaborations</TabsTrigger>
            <TabsTrigger value="team-members">Team Members</TabsTrigger>
          </TabsList>
          
          {/* Collaborations Tab */}
          <TabsContent value="collaborations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isProjectsLoading || isCollaborationsLoading ? (
                // Loading skeletons
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Skeleton className="h-10 w-full mb-4" />
                      <div className="flex -space-x-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-8 rounded-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : projectsAsCollaborator.length === 0 && ownedProjects.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>No Collaborations Yet</CardTitle>
                      <CardDescription>
                        You're not collaborating on any projects yet
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center pb-6">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        You haven't been invited to any projects or created your own projects yet.
                      </p>
                      <Link href="/">
                        <Button>
                          Create a Project
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Projects where user is a collaborator */}
                  {projectsAsCollaborator.map(({ project, collaborators }) => (
                    <Card key={`collab-${project.id}`} className="overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              {project.title}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-500">
                              {project.description || "No description provided"}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
                            {getRoleIcon(collaborators.find(c => c.userId === user?.id)?.role || "collaborator")}
                            <span>
                              {getRoleLabel(collaborators.find(c => c.userId === user?.id)?.role || "collaborator")}
                            </span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2 overflow-hidden">
                            {collaborators.slice(0, 3).map(collab => (
                              <Avatar key={collab.userId} className="border-2 border-white h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getUserInitials(collab.user)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {collaborators.length > 3 && (
                              <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                                +{collaborators.length - 3}
                              </div>
                            )}
                          </div>
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="outline" size="sm">
                              Open Project
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Projects user owns */}
                  {ownedProjects.map(project => {
                    const projectCollabs = collaborations.find(
                      item => item.project.id === project.id
                    )?.collaborators || [];
                    
                    return (
                      <Card key={`owned-${project.id}`} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-semibold">
                                {project.title}
                              </CardTitle>
                              <CardDescription className="text-sm text-gray-500">
                                {project.description || "No description provided"}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                              <Shield className="h-4 w-4" />
                              <span>Owner</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2 overflow-hidden">
                              {projectCollabs.length > 0 ? (
                                projectCollabs.slice(0, 3).map(collab => (
                                  <Avatar key={collab.userId} className="border-2 border-white h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getUserInitials(collab.user)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">No collaborators</div>
                              )}
                              {projectCollabs.length > 3 && (
                                <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                                  +{projectCollabs.length - 3}
                                </div>
                              )}
                            </div>
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="outline" size="sm">
                                Open Project
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Team Members Tab */}
          <TabsContent value="team-members" className="space-y-4">
            {isCollaborationsLoading ? (
              // Loading skeletons for team members
              <Card>
                <CardContent className="pt-6">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center py-3 border-b border-gray-100 last:border-0">
                      <Skeleton className="h-10 w-10 rounded-full mr-4" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : Array.from(allTeamMembers.values()).length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Network</CardTitle>
                  <CardDescription>
                    People you've collaborated with
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    You haven't collaborated with anyone yet. Invite people to your projects to build your network.
                  </p>
                  <Link href="/">
                    <Button>
                      Go to Projects
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Your Network</CardTitle>
                  <CardDescription>
                    People you've collaborated with across projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Array.from(allTeamMembers.values()).map(teamMember => (
                      <div 
                        key={teamMember.id} 
                        className="flex items-center py-3 border-b border-gray-100 last:border-0"
                      >
                        <Avatar className="h-10 w-10 mr-4">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getUserInitials(teamMember)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {teamMember.displayName || teamMember.username}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1" />
                            {teamMember.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {projectsAsCollaborator.filter(item => 
                            item.collaborators.some(c => c.userId === teamMember.id)
                          ).length + ownedProjects.filter(p => 
                            collaborations.find(c => c.project.id === p.id)?.collaborators.some(
                              collab => collab.userId === teamMember.id
                            )
                          ).length} shared projects
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default TeamPage;