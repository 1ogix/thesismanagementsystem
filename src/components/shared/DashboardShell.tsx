"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen, Users, FileText, ClipboardCheck, Bell, LogOut,
  LayoutDashboard, Eye, CalendarDays, UserCog, ChevronDown, Menu, X,
} from "lucide-react";
import { UserRole } from "@/types";
import { toast } from "sonner";

const NAV_ITEMS: Record<
  UserRole,
  { href: string; label: string; icon: React.ElementType }[]
> = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/group", label: "My Group", icon: Users },
    { href: "/student/thesis", label: "My Thesis", icon: FileText },
  ],
  adviser: [
    { href: "/adviser", label: "Dashboard", icon: LayoutDashboard },
    { href: "/adviser/available", label: "Open Theses", icon: Eye },
    { href: "/adviser/assigned", label: "My Advisees", icon: FileText },
  ],
  panel: [
    { href: "/panel", label: "Dashboard", icon: LayoutDashboard },
    { href: "/panel/evaluations", label: "Evaluations", icon: ClipboardCheck },
  ],
  adviser_panel: [
    { href: "/adviser", label: "Adviser Dashboard", icon: LayoutDashboard },
    { href: "/adviser/available", label: "Open Theses", icon: Eye },
    { href: "/adviser/assigned", label: "My Advisees", icon: FileText },
    { href: "/panel", label: "Panel Dashboard", icon: ClipboardCheck },
    { href: "/panel/evaluations", label: "Evaluations", icon: ClipboardCheck },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: UserCog },
    { href: "/admin/theses", label: "All Theses", icon: FileText },
    { href: "/admin/assign", label: "Assignments", icon: Users },
    { href: "/admin/schedules", label: "Schedules", icon: CalendarDays },
  ],
  tech_admin: [
    { href: "/tech-admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tech-admin/courses", label: "Courses", icon: BookOpen },
    { href: "/tech-admin/users", label: "Users", icon: UserCog },
  ],
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);
  const { tmsUser } = useAuth();
  const { notifications, unreadCount, markRead } = useNotifications(tmsUser?.uid ?? null);

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "tms-role=; path=/; max-age=0";
    toast.success("Signed out.");
    router.push("/auth/login");
  }

  const role = tmsUser?.role;
  const navItems = role ? NAV_ITEMS[role] : [];
  const initials = tmsUser?.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 flex flex-col shrink-0 transition-transform duration-200 ease-in-out",
        "md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="relative flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-white">ThesisHub</span>
          <button
            className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                pathname === href
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{tmsUser?.displayName}</p>
              <p className="text-xs text-slate-500">
                {tmsUser?.role ? ROLE_LABELS[tmsUser.role] : "User"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-white/10 w-7 h-7"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <button
            className="md:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex flex-col items-start gap-1 px-4 py-3 cursor-pointer",
                        !n.read && "bg-blue-50"
                      )}
                      onClick={() => markRead(n.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm font-medium">{n.message}</span>
                        {!n.read && (
                          <Badge className="ml-auto text-xs px-1.5 py-0 h-4 bg-blue-500">
                            New
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 h-9 rounded-md hover:bg-accent transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block">{tmsUser?.displayName}</span>
                  <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
