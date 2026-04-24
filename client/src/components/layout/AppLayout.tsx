import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { useProfile } from "@/context/ProfileContext";
import { useTenant } from "@/context/TenantContext";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  User as UserIcon,
  UserPlus,
  Users
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Login", href: "/login", icon: UserIcon },
  { name: "Register", href: "/register", icon: UserPlus },
  { name: "Academic Structure", href: "/academic-structure", icon: Calendar },
  { name: "Classes", href: "/classes", icon: BookOpen },
  { name: "Schools", href: "/schools", icon: Building2, roles: ["platform_admin"] },
  { name: "Create School", href: "/schools-create", icon: Building2 },
  { name: "Students", href: "/students", icon: GraduationCap },
  { name: "Guardians", href: "/guardians", icon: Users },
  // { name: "Teachers", href: "/teachers", icon: Users },
  { name: "Subjects", href: "/subjects", icon: BookOpen },
  // { name: "Assessments", href: "/assessments", icon: CheckSquare },
  { name: "Results", href: "/results", icon: BarChart3 },
  // { name: "Report Cards", href: "/report-cards", icon: FileText },
  { name: "System Users", href: "/users", icon: Users },
  { name: "Audit Trails", href: "/audit-trails", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  centered?: boolean;
}

export function AppLayout({ children, title, description, breadcrumbs, centered }: AppLayoutProps) {
  const [location] = useLocation();
  const { tenants, selectedTenant, setSelectedTenant } = useTenant();
  const { isAuthenticated, profile, logout } = useProfile();
  const hasMemberships = !!profile?.memberships?.length;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all cached data from React Query
      queryClient.clear();
      logout();
      setIsLoggingOut(false);
    }
  };

  // Derive user object from profile
  const user = profile ? {
    name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "User",
    role: profile.role || "user",
    avatar: `${(profile.firstName?.[0] || "").toUpperCase()}${(profile.lastName?.[0] || "").toUpperCase()}`,
    email: profile.email || "",
  } : {
    name: "User",
    role: "user",
    avatar: "U",
    email: "",
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        {/* Mobile sidebar overlay */}
        <div className={`fixed inset-0 z-40 md:hidden ${mobileSidebarOpen ? "" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity ${mobileSidebarOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar
            collapsible="none"
            className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 shadow-lg transition-transform duration-300 z-50 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <SidebarHeader>
              <div className="flex h-12 items-center px-4 font-display text-xl font-bold text-primary tracking-tight">
                <span className="truncate">AtomSoftware</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="overflow-y-auto pb-4">
              <SidebarMenu>
                {navigation.map((item) => {
                  // Show Login/Register only when not authenticated
                  if ((item.name === "Login" || item.name === "Register") && isAuthenticated) return null;

                  // Show other items only when authenticated
                  if (item.name !== "Login" && item.name !== "Register" && !isAuthenticated) return null;

                  // If authenticated but has no school memberships, only show Create School and Settings
                  if (isAuthenticated && !hasMemberships) {
                    if (item.href !== "/schools-create" && item.href !== "/settings") return null;
                  }

                  // Check role visibility
                  if (item.roles && !item.roles.includes(user.role)) return null;

                  // Hide "Create School" link when user already has memberships
                  if (item.href === "/schools-create" && hasMemberships) return null;

                  const isActive = location === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={`flex items-center gap-3 px-4 py-3 text-base rounded-lg ${isActive ? "bg-primary/10 text-primary font-medium" : "text-slate-700 hover:bg-slate-100"}`}
                        onClick={() => setMobileSidebarOpen(false)}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </div>
        {/* Desktop sidebar */}
        {isAuthenticated && (
          <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white hidden md:flex">
            <SidebarHeader>
              <div className="flex h-12 items-center px-4 font-display text-xl font-bold text-primary tracking-tight">
                <span className="truncate">AtomSoftware</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  // Show Login/Register only when not authenticated
                  if ((item.name === "Login" || item.name === "Register") && isAuthenticated) return null;

                  // Show other items only when authenticated
                  if (item.name !== "Login" && item.name !== "Register" && !isAuthenticated) return null;

                  // If authenticated but has no school memberships, only show Create School and Settings
                  if (isAuthenticated && !hasMemberships) {
                    if (item.href !== "/schools-create" && item.href !== "/settings") return null;
                  }

                  // Check role visibility
                  if (item.roles && !item.roles.includes(user.role)) return null;

                  // Hide "Create School" link when user already has memberships
                  if (item.href === "/schools-create" && hasMemberships) return null;

                  const isActive = location === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={isActive ? "bg-primary/10 text-primary font-medium" : "text-slate-600 hover:text-slate-900"}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>

            {isAuthenticated && <SidebarFooter className="overflow-visible">
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      >
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">{user.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{user.name}</span>
                          <span className="truncate text-xs">{user.email}</span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg z-50"
                      side="top"
                      align="end"
                      sideOffset={8}
                      collisionPadding={16}
                    >
                      <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                          <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback className="rounded-lg">{user.avatar}</AvatarFallback>
                          </Avatar>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{user.name}</span>
                            <span className="truncate text-xs">{user.email}</span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {isLoggingOut ? "Logging out..." : "Log out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>}
            <SidebarRail />
          </Sidebar>
        )}

        <div className="flex flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur transition-all">
            {/* Mobile sidebar trigger */}
            <button
              className="md:hidden mr-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Open menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900 hidden md:inline-flex" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {isAuthenticated && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs?.map((crumb, i) => (
                    <div key={i} className="flex items-center">
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            <div className="ml-auto flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {tenants && tenants.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <Building2 className="size-4 text-primary" />
                        <span className="hidden sm:inline">{selectedTenant?.name || "Select School"}</span>
                        <ChevronsUpDown className="size-3 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {tenants.map(t => (
                          <DropdownMenuItem key={t.id} className="cursor-pointer" onClick={() => setSelectedTenant(t)}>
                            <span>{t.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                      <Building2 className="size-4 text-primary" />
                      <span className="hidden sm:inline ml-2">{selectedTenant?.name || (tenants && tenants.length === 1 ? tenants[0].name : "Select School")}</span>
                    </div>
                  )}

                  {/* Header user dropdown (same as footer) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">{user.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{user.name}</span>
                      <ChevronsUpDown className="size-3 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg z-50" side="bottom" sideOffset={8}>
                      <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                          <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback className="rounded-lg">{user.avatar}</AvatarFallback>
                          </Avatar>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{user.name}</span>
                            <span className="truncate text-xs">{user.email}</span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {isLoggingOut ? "Logging out..." : "Log out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                      Login
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                      Register
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-8 animate-in">
              <div className={`space-y-1 ${centered ? "text-center" : ""}`}>
                <h1 className="text-3xl font-display font-bold text-slate-900">{title}</h1>
                {description && <p className="text-slate-500 text-lg">{description}</p>}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
