import { useState } from "react";
import { User } from "@shared/schema";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Separator 
} from "@/components/ui/separator";
import { 
  Avatar, 
  AvatarFallback
} from "@/components/ui/avatar";
import { User as UserIcon, Mail, AtSign, LogOut, Loader2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Form schema for profile update
const profileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const AccountPage = () => {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  
  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json() as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Handle profile update
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  // Get user initials for avatar
  const getUserInitials = (user: User | null) => {
    if (!user) return "??";
    
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
  
  // Format date to readable string
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        </div>
        
        <div className="grid gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center">
                <Avatar className="h-16 w-16 mr-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user?.displayName || user?.username}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-1" />
                    {user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 mb-1">Username</p>
                    <p className="flex items-center font-medium">
                      <AtSign className="h-4 w-4 mr-1 text-gray-500" />
                      {user?.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Member Since</p>
                    <p className="flex items-center font-medium">
                      <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                      {formatDate(user?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Profile Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your displayed name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name that will be displayed to other users
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your email address for notifications and invitations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="mt-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Account Options */}
          <Card>
            <CardHeader>
              <CardTitle>Account Options</CardTitle>
              <CardDescription>
                Manage your account settings and security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button 
                  variant="outline" 
                  className="w-full md:w-auto flex items-center gap-2"
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </div>
              
              <Separator />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will need to login again to access your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default AccountPage;