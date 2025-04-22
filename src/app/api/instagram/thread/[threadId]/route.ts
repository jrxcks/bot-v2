import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

// Helper function to extract state header
function getSessionState(request: Request): string | null {
    return request.headers.get('X-Instagram-State');
}

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;
  // Get the full state string from the custom header
  const sessionState = getSessionState(request);

  if (!sessionState) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing session state' }, { status: 401 });
  }
  if (!threadId) {
      return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
  }

  try {
    const client = new InstagramClient();
    // Load state using the full state string
    await client.deserializeFullState(sessionState); 

    const threadData = await client.getThread(threadId);
    
    // Structure matches ConversationView (needs adjustment based on simplified getThread)
    return NextResponse.json({ 
        success: true, 
        data: { 
            thread: { 
                thread_id: threadData?.thread_id, // Use thread_id directly
                users: [], // Placeholder - getThread no longer fetches users
                items: threadData?.items ?? [], 
                viewer_id: threadData?.viewer_id 
            }
        } 
    });

  } catch (e: unknown) {
      console.error(`Thread API Error for ${threadId}:`, e);
      let errorMessage = `Failed to fetch thread ${threadId}.`;
      let statusCode = 500;

      if (e instanceof Error) {
          errorMessage = e.message;
          // Check for session/deserialize errors
          if (errorMessage.includes('Session expired') || errorMessage.includes('invalid') || errorMessage.includes('deserialize')) {
              statusCode = 401; // Unauthorized
          }
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}