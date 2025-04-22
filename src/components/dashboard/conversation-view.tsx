'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Keep router for potential redirects on auth failure
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area"; // Useful for message list

// Re-define or import shared interfaces
interface Message {
  item_id: string;
  text?: string;
  user_id: string;
  timestamp: string;
  item_type: string;
}

interface Thread {
  thread_id: string;
  users: Array<{ username: string; full_name: string; profile_pic_url: string; }>;
  items: Message[];
  viewer_id?: string;
}

interface ConversationViewProps {
  threadId: string | null; // Accept threadId as prop
}

export default function ConversationView({ threadId }: ConversationViewProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false); // Only loading messages, not entire page
  const [error, setError] = useState('');
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Effect to get user ID (runs once)
  useEffect(() => {
    const storedUserId = localStorage.getItem('instagramUserId');
    if (storedUserId) {
       setCurrentUserId(storedUserId);
    }
  }, []);

  // Fetch thread data when threadId prop changes
  const fetchThread = useCallback(async () => {
      if (!threadId) {
          setThread(null); // Clear thread if no ID
          setLoading(false);
          return;
      } 
      
      console.log(`ConversationView (${threadId}): Fetching thread...`);
      setLoading(true);
      setError('');
      try {
        const sessionId = localStorage.getItem('instagramSessionId');
        if (!sessionId) {
          console.log(`ConversationView (${threadId}): No sessionId found! Redirecting.`);
          router.push('/'); 
          return;
        }

        const response = await fetch(`/api/instagram/thread/${threadId}`, {
          headers: { 'Authorization': `Bearer ${sessionId}` },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` })); 
          // Handle session expiry specifically
          if (response.status === 401 || errorData?.error?.includes('Session expired') || errorData?.error?.includes('invalid or expired')) {
              console.log(`ConversationView (${threadId}): Session expired/invalid. Clearing session.`);
              localStorage.removeItem('instagramSessionId');
              localStorage.removeItem('instagramUserId');
              router.push('/'); // Redirect on session failure
              return;
          }
          throw new Error(errorData.error || `Failed to fetch thread (${response.status})`);
        }

        const data = await response.json();
        if (data.success && data.data?.thread) {
          const threadData = data.data.thread;
          threadData.items = Array.isArray(threadData.items) ? threadData.items : [];
          // Set currentUserId if not already set
          if (threadData.viewer_id && currentUserId === null) {
              const viewerIdStr = String(threadData.viewer_id);
              setCurrentUserId(viewerIdStr);
              localStorage.setItem('instagramUserId', viewerIdStr);
          }
          setThread(threadData);
        } else {
          throw new Error(data.error || 'Invalid data structure received');
        }
      } catch (err) {
        console.error(`ConversationView (${threadId}): Caught error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load thread');
        setThread(null); // Clear thread data on error
      } finally {
        setLoading(false);
      }
    // Depend on threadId, router, and currentUserId (for re-render if ID becomes available)
    }, [threadId, router, currentUserId]); 

  // Run fetchThread whenever threadId changes
  useEffect(() => {
    fetchThread();
  }, [threadId, fetchThread]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !threadId) return;
    setError(''); 

    // Store current message to potentially add optimistically
    const messageToSend = newMessage;
    setNewMessage(''); // Clear input immediately

    try {
      const sessionId = localStorage.getItem('instagramSessionId');
      if (!sessionId) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/instagram/thread/${threadId}/send`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }), // Use stored message
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
         // Revert optimistic clear if sending failed
         setNewMessage(messageToSend); 
         throw new Error(result.error || 'Failed to send message');
      }

      // Message sent successfully, refetch to get the latest state
       await fetchThread(); 

    } catch (err) {
      // Revert optimistic clear if sending failed
       setNewMessage(messageToSend);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error(err);
    }
  };

  // --- Render Logic --- 
  
  // Placeholder if no thread is selected
  if (!threadId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a conversation to view messages.
      </div>
    );
  }

  // Loading state for messages
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        Loading messages...
      </div>
    );
  }

  // Error state for messages
  if (error && !thread) { // Show error only if thread failed to load entirely
     return (
       <div className="flex h-full items-center justify-center text-red-600">
         Error: {error}
       </div>
     );
  }

  // No thread data (should ideally be covered by error state, but good fallback)
  if (!thread) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Could not load conversation.
        </div>
      );
  }

  // Main conversation view
  return (
    <div className="flex flex-col h-full w-full">
      {/* Message Area - Use ScrollArea */}
       <ScrollArea className="flex-1 p-4">
          {/* We reverse flex direction in the parent and render messages normally */} 
          <div className="flex flex-col-reverse gap-4">
             {thread.items.map((message) => {
                if (message.item_type !== 'text' || !message.text) return null; 
                const isSentByUser = String(message.user_id) === String(currentUserId);
                return (
                <div
                    key={message.item_id}
                    className={`flex w-full ${isSentByUser ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`max-w-[75%] rounded-lg p-3 text-sm ${isSentByUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p>{message.text}</p>
                    {/* Optional: Add timestamp - needs parsing */}
                    {/* <p className="text-xs mt-1 opacity-75 text-right">
                        {new Date(parseInt(message.timestamp) / 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p> */} 
                    </div>
                </div>
                );
             })}
          </div>
       </ScrollArea>

       {/* Input Area */} 
       <div className="border-t p-4">
          {/* Display temporary send errors here */}
          {error && error.startsWith("Failed to send") && (
            <p className="text-red-600 text-xs mb-2">Error sending: {error}</p>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                autoComplete="off"
            />
            <Button type="submit" disabled={!newMessage.trim()}>Send</Button>
          </form>
       </div>
    </div>
  );
} 