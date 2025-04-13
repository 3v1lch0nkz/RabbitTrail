import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page-fixed";
import ProjectPage from "@/pages/project-page";
import TeamPage from "@/pages/team-page";
import AccountPage from "@/pages/account-page";
import LandingPage from "@/pages/landing-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={HomePage} />
      <ProtectedRoute path="/projects/:id" component={ProjectPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/account" component={AccountPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <AuthProvider>
        <Router />
      </AuthProvider>
      <Toaster />
    </>
  );
}

export default App;
