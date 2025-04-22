'use client'; // Add this directive

import Link from 'next/link';
import { 
  LayoutDashboard, 
  Inbox, 
  Users, 
  Bot, 
  Settings, 
  LifeBuoy 
} from 'lucide-react';
import { Button } from "@/components/ui/button"; // Assuming shadcn setup
import { usePathname } from 'next/navigation'; // Hook to check current path
import { cn } from "@/lib/utils"; // For conditional classes

// Helper component for nav links with active state
function NavLink({ href, icon: Icon, children }: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} passHref>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn("w-full justify-start", isActive && "font-bold")} // Add bold if active
      >
        <Icon className="mr-2 h-4 w-4" />
        {children}
      </Button>
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Bot className="h-6 w-6" /> 
          <span className="">InstaBot</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <NavLink href="/dashboard" icon={LayoutDashboard}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/inbox" icon={Inbox}>
            Inbox
          </NavLink>
          <NavLink href="/dashboard/contacts" icon={Users}>
            Contacts
          </NavLink>
          <NavLink href="/dashboard/automations" icon={Bot}>
            Automations
          </NavLink>
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <nav className="grid gap-1">
          <NavLink href="/dashboard/settings" icon={Settings}>
            Settings
          </NavLink>
          <NavLink href="/dashboard/help" icon={LifeBuoy}>
            Help & Support
          </NavLink>
        </nav>
      </div>
    </aside>
  );
} 