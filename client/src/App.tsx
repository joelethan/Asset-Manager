import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/context/TenantContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { useProfile } from "@/context/ProfileContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AcademicStructure from "@/pages/AcademicStructure";
import Schools from "@/pages/Schools";
import Students from "@/pages/Students";
import Teachers from "@/pages/Teachers";
import Classes from "@/pages/Classes";
import Settings from "@/pages/Settings";

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isAuthenticated } = useProfile();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function RootRedirect() {
  const { isAuthenticated } = useProfile();
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useProfile();
  
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component />;
}

function CatchAllRedirect() {
  const { isAuthenticated } = useProfile();
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function Router() {
  const { isAuthenticated } = useProfile();
  
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      
      {/* Public routes - redirect to dashboard if already authenticated */}
      <Route path="/login">
        <PublicRoute component={Login} />
      </Route>
      <Route path="/register">
        <PublicRoute component={Register} />
      </Route>
      
      {/* Protected routes - only when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/academic-structure" component={AcademicStructure} />
          <Route path="/schools" component={Schools} />
          <Route path="/students" component={Students} />
          <Route path="/teachers" component={Teachers} />
          <Route path="/classes" component={Classes} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      
      {/* Catch-all for unrecognized routes */}
      <Route component={CatchAllRedirect} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TenantProvider>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            <Router />
          </TooltipProvider>
        </TenantProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
