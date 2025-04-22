import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header'; // We will create this next
import { SidebarProvider } from "@/components/ui/sidebar"; // Remove SidebarInset

export default function DashboardLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    // Wrap everything in the provider
    <SidebarProvider>
      {/* Outer container needs full screen height and width */}
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar takes fixed width, main content takes the rest */}
        <Sidebar /> 
        {/* Add border-l for visual separation */}
        {/* Main content area wrapped by SidebarInset */} 
        <div className="flex flex-1 flex-col overflow-hidden"> {/* Added overflow-hidden */}
          {/* Header is positioned at the top */}
          <Header />
          {/* Main content area takes remaining height and handles its own scrolling */}
          <main className="flex-1 overflow-y-auto">
            {/* REMOVE padding from this wrapper div */}
            {/* h-full might still be needed depending on child components */} 
            <div className="h-full"> 
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
} 