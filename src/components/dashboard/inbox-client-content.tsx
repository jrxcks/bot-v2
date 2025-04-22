'use client';

import { useEffect, useState } from 'react'; // Remove Suspense import
import { useRouter, useSearchParams } from 'next/navigation';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"; // For conditional styling
import ConversationView from '@/components/dashboard/conversation-view'; // Import the new component

// Re-define or import shared interfaces
interface User {
    pk: string;
    username: string;
    full_name: string;
    is_private: boolean;
    profile_pic_url: string;
    profile_pic_id: string;
    is_verified: boolean;
}

interface MessageThread {
  thread_id: string;
  users: User[];
  last_activity_at: number;
  thread_title: string;
  // Add other relevant fields if needed (like read status later)
}

// This component now contains the client-side logic and state
export default function InboxClientContent() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [error, setError] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params

  // Effect to set initial selected thread from URL query param
  useEffect(() => {
    const threadIdFromUrl = searchParams.get('threadId');
    if (threadIdFromUrl && !selectedThreadId) { // Only set if not already selected by user
        console.log("InboxClientContent: Setting selected thread from URL:", threadIdFromUrl);
        setSelectedThreadId(threadIdFromUrl);
    }
    // Depend on searchParams to react to URL changes
  }, [searchParams, selectedThreadId]);

  // Fetch the list of threads (inbox)
  useEffect(() => {
    const fetchInboxList = async () => {
      console.log("InboxClientContent: Fetching thread list...");
      setLoadingThreads(true);
      setError('');
      
      try {
        // Get session ID from localStorage
        const sessionId = localStorage.getItem('instagramSessionId'); 
        console.log("InboxClientContent fetchInboxList: Retrieved sessionId...", sessionId ? sessionId.substring(0, 6) + '...' : 'null'); // Log session ID
        if (!sessionId) {
          console.log('InboxClientContent List: No session ID found. Redirecting.');
          router.push('/');
          return;
        }

        console.log("InboxClientContent List: Sending Authorization header.");
        const response = await fetch('/api/instagram/inbox', {
          headers: { 
              'Authorization': `Bearer ${sessionId}` 
          },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            console.error("InboxClientContent List: API Error Response Data:", errorData); 
             if (response.status === 401 || errorData?.error?.includes('Session expired') || errorData?.error?.includes('invalid')) { 
                console.log('InboxClientContent List: Session expired/invalid detected in API response. Clearing session.');
                localStorage.removeItem('instagramSessionId'); 
                localStorage.removeItem('instagramUserId');
                router.push('/');
                return;
            }
            const thrownErrorMessage = errorData.error || `Failed to fetch inbox list (${response.status})`;
            console.error("InboxClientContent List: Throwing fetch error:", thrownErrorMessage);
            throw new Error(thrownErrorMessage);
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setThreads(data.data);
        } else {
          throw new Error(data.error || 'Invalid inbox list data received');
        }
      } catch (err) {
         console.error("InboxClientContent List: Caught final fetch error in catch block:", err); 
         setError(err instanceof Error ? err.message : 'Failed to load threads');
      } finally {
        setLoadingThreads(false);
      }
    };

    fetchInboxList();
  }, [router]); // Depend on router for navigation redirects

  const handleThreadSelect = (threadId: string) => {
    console.log("Selected thread manually:", threadId);
    setSelectedThreadId(threadId);
  };

  // Main Two-Pane Layout (moved from InboxPage)
  return (
    <div className="flex h-full w-full border-t overflow-hidden"> 
      {/* Left Pane: Thread List */} 
      <div className="w-full max-w-xs border-r flex flex-col flex-shrink-0 bg-muted/40"> 
         <h2 className="text-lg font-semibold p-4 border-b flex-shrink-0">Conversations</h2> 
         <ScrollArea className="flex-1 p-2">
           {loadingThreads && <p className="p-2 text-muted-foreground">Loading...</p>}
           {error && <p className="p-2 text-red-600">Error: {error}</p>}
           {!loadingThreads && !error && threads.length === 0 && (
             <p className="p-2 text-muted-foreground">No conversations found.</p>
           )}
           {!loadingThreads && !error && (
             <div className="space-y-1">
               {threads.map((thread) => (
                 <button
                   key={thread.thread_id}
                   className={cn(
                     "flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-all hover:bg-accent",
                     selectedThreadId === thread.thread_id && "bg-accent font-medium"
                   )}
                   onClick={() => handleThreadSelect(thread.thread_id)}
                 >
                   <img 
                     src={thread.users?.[0]?.profile_pic_url ?? 'https://via.placeholder.com/40'}
                     alt={thread.users?.[0]?.username ?? 'User'}
                     className="h-8 w-8 rounded-full object-cover"
                     onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40')}
                   />
                   <div className="flex-1 truncate">
                      <p className="font-medium truncate">
                        {thread.thread_title || thread.users?.map(user => user.username).join(', ')}
                      </p>
                   </div>
                   <span className="text-xs text-muted-foreground">
                      {new Date(thread.last_activity_at / 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                   </span>
                 </button>
               ))}
             </div>
           )}
         </ScrollArea>
      </div>

      {/* Right Pane: Conversation View */} 
      <div className="flex-1 border-l">
         {/* Ensure ConversationView is correctly passed the selectedThreadId */}
         <ConversationView threadId={selectedThreadId} />
      </div>

    </div>
  );
} 