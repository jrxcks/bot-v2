'use client'; // Header needs client-side hooks/components

import Link from "next/link"
import { usePathname } from 'next/navigation';
import {
  PanelLeft, // Icon for trigger
  Search,
  Package2, // Placeholder icon for mobile nav
} from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"; // Import the trigger
import React from "react"

// Function to generate breadcrumbs based on pathname (simplified)
function generateBreadcrumbs(pathname: string) {
    const segments = pathname.split('/').filter(Boolean);
    // Start with unique base key
    const breadcrumbs = [{ key: "/dashboard-0", href: "/dashboard", label: "Dashboard" }]; 

    // Special handling for thread pages
    if (segments[0] === 'dashboard' && segments[1] === 'thread' && segments[2]) {
        // Key for Inbox link can be static here as it's unique path
        breadcrumbs.push({ key: "/dashboard-inbox", href: "/dashboard", label: "Inbox" }); 
        // Key for Conversation can use pathname
        breadcrumbs.push({ key: pathname, href: pathname, label: "Conversation" }); 
    } 
    // Generic handling for other potential dashboard sub-pages
    else if (segments[0] === 'dashboard' && segments.length > 1) {
         let currentPath = '/dashboard';
         for (let i = 1; i < segments.length; i++) {
             const segment = segments[i];
             currentPath += `/${segment}`;
             const label = segment.charAt(0).toUpperCase() + segment.slice(1);
             const isLast = i === segments.length - 1;
             // Generate a key that includes the index to ensure uniqueness
             const key = `${currentPath}-${i}`;
             if (!isLast || !/^[a-zA-Z0-9-_]{10,}$/.test(segment)) {
                 breadcrumbs.push({ key: key, href: currentPath, label: label });
             }
         }
    }

    return breadcrumbs;
}

export default function Header() {
    const pathname = usePathname();
    const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:bg-background md:border-b w-full">
       {/* Sidebar Trigger for Desktop/Tablet */}
       {/* Ensure this trigger is styled appropriately */}
      <SidebarTrigger className="hidden sm:flex p-1 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" /> 
       
      {/* Mobile Menu using Sheet */}
       <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          {/* TODO: Replicate sidebar navigation links here for mobile */}
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">InstaBot</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            {/* Add other mobile links here */}
          </nav>
        </SheetContent>
      </Sheet>
      
      {/* Breadcrumbs */}
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            // Use crumb.key for the React Fragment key
            <React.Fragment key={crumb.key}> 
              <BreadcrumbItem>
                 {/* Use index check for BreadcrumbPage, not key */}
                 {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Spacer to push user menu to the right */}
      <div className="ml-auto flex items-center gap-2"> 
        {/* Search (Optional) */}
        {/* <div className="relative flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
          />
        </div> */} 

        {/* User Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full"
            >
              {/* Placeholder Avatar */}
               <img 
                  src={'https://via.placeholder.com/32'} // Placeholder image
                  width={32}
                  height={32}
                  alt="Avatar"
                  className="overflow-hidden rounded-full"
               />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
       </div>
    </header>
  );
} 