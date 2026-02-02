import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/context/TenantContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { useProfile } from "@/context/ProfileContext";
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
  const { isAuthenticated, initialized } = useProfile();

  if (!initialized) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <Component />;
}

function RootRedirect() {
  const { isAuthenticated, initialized } = useProfile();
  if (!initialized) return null;
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, initialized } = useProfile();
  if (!initialized) return null;
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <Component />;
}

function CatchAllRedirect() {
  const { isAuthenticated, initialized } = useProfile();
  if (!initialized) return null;
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function AppRouter() {
  const { isAuthenticated } = useProfile();
  return (
    <WouterRouter>
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
    </WouterRouter>
  );
}

function useHashLocation(): [string, (to: string) => void] {
  const getHash = () => (typeof window !== "undefined" ? (window.location.hash ? window.location.hash.slice(1) : "/") : "/");
  const [loc, setLoc] = useState<string>(getHash);

  useEffect(() => {
    const onHashChange = () => setLoc(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (to: string) => {
    if (typeof window !== "undefined") window.location.hash = to;
  };

  return [loc, navigate];
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TenantProvider>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </TenantProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
