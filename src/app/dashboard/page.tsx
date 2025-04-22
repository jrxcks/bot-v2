'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"; // Assuming shadcn setup
import { MessageSquareText, CornerDownRight, Inbox, Bot } from "lucide-react"; // Icons for stats

interface MessageThread {
  thread_id: string;
  users: Array<{
    pk: string; // User primary key
    username: string;
    full_name: string;
    is_private: boolean;
    profile_pic_url: string;
    profile_pic_id: string;
    is_verified: boolean;
    has_anonymous_profile_picture: boolean;
    reel_auto_archive: string;
    allowed_commenter_type: string;
  }>;
  thread_items: unknown[]; // Changed from any[]
  last_activity_at: number; // Timestamp (microseconds)
  muted: boolean;
  is_pin: boolean;
  named: boolean;
  canonical: boolean;
  pending: boolean;
  archived: boolean;
  thread_type: string;
  viewer_id: number;
  thread_title: string;
  pending_score: string;
  folder: number;
  vc_muted: boolean;
  is_group: boolean;
  mentions_muted: boolean;
  approval_required_for_new_members: boolean;
  input_mode: number;
  business_thread_folder: number;
  read_state: number;
  inviter: unknown; // Changed from any
  has_older: boolean;
  has_newer: boolean;
  last_seen_at: Record<string, { timestamp: string, item_id: string }>;
  newest_cursor: string;
  oldest_cursor: string;
  next_cursor: unknown; // Changed from any
  prev_cursor: unknown; // Changed from any
  is_spam: boolean;
  last_permanent_item: unknown; // Changed from any
}

export default function Dashboard() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchInbox = async () => {
      console.log("Dashboard useEffect: Fetching inbox...");
      setLoading(true); 
      setError(''); 
      try {
        // Get session STATE from localStorage
        const sessionState = localStorage.getItem('instagramSessionState');
        console.log("Dashboard useEffect: Found sessionState:", sessionState ? sessionState.substring(0, 50) + '...' : 'null');

        if (!sessionState) {
          console.log('Dashboard useEffect: No sessionState found! Redirecting to login.');
          router.push('/');
          return;
        }

        console.log("Dashboard useEffect: Making API call to /api/instagram/inbox with state header.");
        const response = await fetch('/api/instagram/inbox', {
          headers: {
            // Send state in custom header
            'X-Instagram-State': sessionState,
          },
        });
        console.log("Dashboard useEffect: API response status:", response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` })); 
            console.error("Dashboard useEffect: API Error Response Data:", errorData);
            // Check if the error indicates an invalid/expired session on the server
            if (response.status === 401 || errorData?.error?.includes('Session expired') || errorData?.error?.includes('invalid') || errorData?.error?.includes('deserialize') || errorData?.error?.includes('Missing session state')) {
                console.log('Dashboard useEffect: Session expired/invalid on server. Clearing local session and redirecting.');
                localStorage.removeItem('instagramSessionState');
                localStorage.removeItem('instagramUserId');
                router.push('/');
                return;
            }
            throw new Error(errorData.error || `Failed to fetch inbox (${response.status})`);
        }

        const data = await response.json();
        console.log("Dashboard useEffect: API success response:", data);
        if (data.success && Array.isArray(data.data)) {
          setThreads(data.data);
        } else {
          console.error("Dashboard useEffect: Invalid data structure received:", data);
          throw new Error(data.error || 'Invalid inbox data received');
        }
      } catch (err) {
        console.error("Dashboard useEffect: Caught error:", err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        // Don't redirect here, just show error state
      } finally {
        console.log("Dashboard useEffect: Setting loading false.");
        setLoading(false);
      }
    };

    fetchInbox();
  }, [router]); // Keep router dependency

  const handleThreadClick = (threadId: string) => {
    // Navigate to the inbox page with the threadId as a query parameter
    router.push(`/dashboard/inbox?threadId=${threadId}`);
  };

  // Placeholder stats - replace with real data when backend supports it
  const totalThreads = threads.length;
  const unreadCount = 0; // Placeholder
  const repliedCount = 0; // Placeholder

  // Loading State UI
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading Dashboard...</div>
        {/* Optional: Add a spinner component here */}
      </div>
    );
  }

  // Main Dashboard UI
  return (
    <div className="space-y-4 w-full pt-6">
      {/* Header Section (Title) */}
      <div className="flex items-center justify-between space-y-2 px-4 sm:px-6 md:px-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 sm:px-6 md:px-8 w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalThreads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">(Requires backend update)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replied Threads</CardTitle>
            <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repliedCount}</div>
             <p className="text-xs text-muted-foreground">(Requires backend update)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" /> 
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">Auto-replies enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Inbox / Other Sections Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 px-4 sm:px-6 md:px-8 w-full">
        <Card className="md:col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {error && (
              <div className="text-red-600 p-4">Error: {error}</div>
            )}
            {!error && threads.length === 0 && (
              <div className="text-center text-muted-foreground p-4">No conversations found.</div>
            )}
            {!error && threads.length > 0 && (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className="flex items-center p-3 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => handleThreadClick(thread.thread_id)}
                  >
                    <img 
                      src={thread.users?.[0]?.profile_pic_url ?? 'https://via.placeholder.com/40'}
                      alt={thread.users?.[0]?.username ?? 'User'}
                      className="h-9 w-9 rounded-full mr-3 object-cover"
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40')}
                    />
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {thread.thread_title || thread.users?.map(user => user.username).join(', ')}
                      </p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                      {new Date(thread.last_activity_at / 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-3 lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions / Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
                (Future area for common automation controls, performance charts, or other relevant info)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 