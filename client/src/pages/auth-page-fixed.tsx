import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema, User, InsertUser } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Map, LogIn, UserPlus, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Login schema
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

// Registration schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface InvitationInfo {
  invitation: {
    id: number;
    projectId: number;
    email: string;
    token: string;
    role: string;
    status: string;
    expiresAt: string;
  };
  project: {
    id: number;
    title: string;
    description: string | null;
  };
}

const AuthPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [_, navigate] = useLocation();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  
  // Get query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invitation");
    if (token) {
      setInvitationToken(token);
      setActiveTab("register");  // Switch to register tab if we have an invitation
    }
  }, []);
  
  // Get user data
  const { 
    data: user,
    isLoading 
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Fetch invitation details if we have a token
  const {
    data: invitationData,
    isLoading: invitationLoading,
    error: invitationError
  } = useQuery<InvitationInfo>({
    queryKey: ["/api/invitations", invitationToken],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!invitationToken,  // Only run if we have a token
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName || user.username}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to RabbitTrail, ${user.displayName || user.username}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", `/api/invitations/${token}/accept`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have joined the project!",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join project",
        description: error.message || "Could not accept the invitation",
        variant: "destructive",
      });
    },
  });
  
  // Set invitation info when we get data
  useEffect(() => {
    if (invitationData) {
      setInvitationInfo(invitationData);
      
      // Pre-fill email field for registration if we have an invitation
      if (invitationData.invitation.email) {
        registerForm.setValue("email", invitationData.invitation.email);
      }
    }
  }, [invitationData, registerForm]);

  // Handle registration success with invitation token
  useEffect(() => {
    if (user && invitationToken) {
      // User registered successfully with an invitation, now accept it
      acceptInvitationMutation.mutate(invitationToken);
    }
  }, [user, invitationToken, acceptInvitationMutation]);
  
  // Redirect if already logged in and no invitation is being processed
  useEffect(() => {
    if (user && !(invitationToken && acceptInvitationMutation.isPending)) {
      navigate("/");
    }
  }, [user, navigate, invitationToken, acceptInvitationMutation.isPending]);

  const onLogin = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterFormValues) => {
    // Remove confirmPassword as it's not part of the API
    const { confirmPassword, ...registrationData } = data;
    registerMutation.mutate(registrationData);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-white">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Map className="h-8 w-8 text-primary" />
              <span className="font-semibold text-xl text-primary">RabbitTrail</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to RabbitTrail</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Show invitation info if we have it */}
            {invitationInfo && (
              <Alert className="mb-4 bg-primary/10 border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <AlertTitle className="flex items-center gap-2 font-medium text-primary">
                  <span>Project Invitation</span>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-sm">
                    You've been invited to join <span className="font-medium">{invitationInfo.project.title}</span> as a{" "}
                    <span className="font-medium">{invitationInfo.invitation.role}</span>.
                  </p>
                  {!user && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Create an account with <span className="font-medium">{invitationInfo.invitation.email}</span> or log in to accept the invitation.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Show loading state for invitation */}
            {invitationToken && invitationLoading && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>
                  <p className="text-sm font-medium">Loading invitation details...</p>
                </div>
              </Alert>
            )}
            
            {/* Show invitation error */}
            {invitationToken && invitationError && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertTitle className="text-red-700 font-medium">
                  Invalid or Expired Invitation
                </AlertTitle>
                <AlertDescription className="text-red-600 text-sm">
                  This invitation is no longer valid or has expired. Please contact the project owner for a new invitation.
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs 
              defaultValue="login" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "login" | "register")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="your_username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                          Logging in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Login
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="your_username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                          Creating account...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Create Account
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-center w-full text-gray-500">
              {activeTab === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button 
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button 
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </button>
                </p>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div 
        className="hidden md:flex md:w-1/2 bg-primary flex-col justify-center items-center p-8 text-white"
      >
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Your Investigation Platform</h1>
          <p className="text-lg mb-6">
            Document, organize, and collaborate on your investigations with our map-based platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Map className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Map-Based Documentation</h3>
                <p className="text-sm opacity-80">Plot evidence and sightings geographically</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Media Organization</h3>
                <p className="text-sm opacity-80">Add images and audio recordings to entries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Team Collaboration</h3>
                <p className="text-sm opacity-80">Invite others to contribute to your projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;