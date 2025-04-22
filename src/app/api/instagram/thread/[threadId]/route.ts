import { NextResponse, NextRequest } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';
import { getSessionState } from '@/lib/instagram/sessionStore';

// Helper function to extract session ID from Authorization header
function getSessionId(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

// Update function signature to use NextRequest and context
export async function GET(
  request: NextRequest, 
  context: { params: { threadId: string } }
) {
  const threadId = context.params.threadId;
  const sessionId = getSessionId(request);

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing session ID' }, { status: 401 });
  }
  if (!threadId) {
      return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
  }

  try {
    // Retrieve state string from KV using sessionId
    const stateString = await getSessionState(sessionId); 
    if (!stateString) {
        console.warn(`Thread API: Session state not found in KV for ID: ${sessionId.substring(0, 6)}`);
        return NextResponse.json({ success: false, error: 'Session not found or expired.' }, { status: 401 });
    }

    const client = new InstagramClient();
    // Deserialize using the state string from KV
    await client.deserializeFullState(stateString); 

    const threadData = await client.getThread(threadId);
    
    // Use the data structure returned by the simplified getThread
    return NextResponse.json({ 
        success: true, 
        data: { 
            thread: { 
                thread_id: threadData.thread_id,
                users: [], // Placeholder as getThread doesn't fetch users now
                items: threadData.items ?? [], 
                viewer_id: threadData.viewer_id 
            }
        } 
    });

  } catch (e: unknown) {
      console.error(`Thread API Error for ${threadId}:`, e);
      let errorMessage = `Failed to fetch thread ${threadId}.`;
      let statusCode = 500;
      if (e instanceof Error) {
          errorMessage = e.message;
          if (errorMessage.includes('Session expired') || errorMessage.includes('invalid') || errorMessage.includes('deserialize')) {
              statusCode = 401;
          }
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}