"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  FolderOpen,
  PlusCircle,
  Terminal,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  FileQuestion,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/questions", label: "Questions", icon: FileQuestion },
  { href: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { href: "/question/new", label: "New Question", icon: PlusCircle },
  { href: "/sql", label: "SQL Editor", icon: Terminal },
];

const adminItems = [
  { href: "/admin/databases", label: "Databases", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 h-14">
        <Logo size={24} className="text-primary" />
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">
            InsightBase
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto h-7 w-7", collapsed && "ml-0")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin
              </p>
            )}
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </>
        )}
      </nav>

      <Separator />

      {/* User section */}
      <div className="p-2">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {session?.user?.name || session?.user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {(session?.user as { role?: string })?.role}
              </p>
            </div>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"}>
              Sign out
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
