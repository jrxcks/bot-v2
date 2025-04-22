import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

// Renamed helper function for clarity
function getAuthToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    return null;
}

// Updated signature to use destructured params pattern exactly as in Next.js docs
export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;
  const authToken = getAuthToken(request); // Use renamed helper

  if (!authToken) {
    // Changed session ID to auth token in message
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing auth token' }, { status: 401 });
  }
  if (!threadId) {
      return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
  }

  try {
    // Removed session store lookup:
    // const stateString = await getSessionState(sessionId); 
    // if (!stateString) { ... }

    const client = new InstagramClient();
    
    // Create a state object structure similar to the 'send' route
    const stateObj = {
        cookies: [
            {
                key: 'authorization',
                value: authToken,
                domain: 'i.instagram.com',
                path: '/',
                hostOnly: true,
                secure: true, 
                httpOnly: true,
                creation: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            }
            // ds_user_id and other cookies might be needed depending on client library behavior
        ],
        cookieJar: { // Include a minimal cookie jar structure if needed by deserializeFullState
            version: 'tough-cookie@4.1.2', // Example version
            storeType: 'MemoryCookieStore',
            rejectPublicSuffixes: true,
            cookies: [] // Initially empty, `deserializeFullState` might populate it
        }
        // Device info is likely handled internally by the client on deserialize
    };

    // Serialize the minimal state object to JSON string
    const stateString = JSON.stringify(stateObj);

    // Deserialize using the minimal state string
    await client.deserializeFullState(stateString);

    // Fetch thread data
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
      // Keep existing error handling
      console.error(`Thread API Error for ${threadId}:`, e);
      let errorMessage = `Failed to fetch thread ${threadId}.`;
      let statusCode = 500;
      if (e instanceof Error) {
          errorMessage = e.message;
          // Check for session/authentication errors
          if (errorMessage.includes('Session expired') || 
              errorMessage.includes('invalid') || 
              errorMessage.includes('deserialize') || 
              errorMessage.includes('login required')) { // Added 'login required'
              statusCode = 401; // Unauthorized
          }
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}