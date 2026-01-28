import { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useTenant } from "@/context/TenantContext";
import { useProfile } from "@/context/ProfileContext";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  Settings,
  ChevronsUpDown,
  LogOut,
  User as UserIcon,
  UserPlus,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Login", href: "/login", icon: UserIcon },
  { name: "Register", href: "/register", icon: UserPlus },
  { name: "Academic Structure", href: "/academic-structure", icon: Calendar },
  { name: "Schools", href: "/schools", icon: Building2, roles: ["platform_admin"] },
  { name: "Students", href: "/students", icon: GraduationCap },
  { name: "Teachers", href: "/teachers", icon: Users },
  { name: "Classes", href: "/classes", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppLayout({ children, title, description, breadcrumbs }: AppLayoutProps) {
  const [location] = useLocation();
  const { tenants, selectedTenant, setSelectedTenant } = useTenant();
  const { isAuthenticated, profile } = useProfile();

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
          <SidebarHeader>
            <div className="flex h-12 items-center px-4 font-display text-xl font-bold text-primary tracking-tight">
              <span className="truncate">EduPlatform</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => {
                // Show Login/Register only when not authenticated
                if ((item.name === "Login" || item.name === "Register") && isAuthenticated) return null;

                // Show other items only when authenticated
                if (item.name !== "Login" && item.name !== "Register" && !isAuthenticated) return null;

                // Check role visibility
                if (item.roles && !item.roles.includes(user.role)) return null;

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

          {isAuthenticated && <SidebarFooter>
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
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg z-50"
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
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>}
          <SidebarRail />
        </Sidebar>

        <div className="flex flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur transition-all">
            <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
            <Separator orientation="vertical" className="mr-2 h-4" />

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

            <div className="ml-auto flex items-center gap-4">
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
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-8 animate-in">
              <div className="space-y-1">
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
