import { NextResponse, type NextRequest } from 'next/server';
import { InstagramClient, SimplifiedThreadData } from '@/lib/instagram/client';

// Keep helper function
function getAuthToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Use 'any' type assertion as workaround
) {
  // Access params from context, assuming structure & add type assertion
  const threadId = context?.params?.threadId as string | undefined;

  // --- Remove Simplified Logic Start ---
  // console.log(`Simplified GET handler called for threadId: ${threadId}`)
  // return NextResponse.json({ 
  //     success: true, 
  //     message: `Successfully received threadId: ${threadId}`,
  //     data: { threadId: threadId }
  // });
  // --- Remove Simplified Logic End ---

  // --- Restore Original Logic Start ---
  const authToken = getAuthToken(request);

  if (!authToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing auth token' }, { status: 401 });
  }
  if (!threadId) {
      // Type guard ensures threadId is string below
      return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
  }

  try {
    const client = new InstagramClient();
    
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
        ],
        cookieJar: {
            version: 'tough-cookie@4.1.2',
            storeType: 'MemoryCookieStore',
            rejectPublicSuffixes: true,
            cookies: []
        }
    };

    const stateString = JSON.stringify(stateObj);
    await client.deserializeFullState(stateString);
    
    // Ensure SimplifiedThreadData is used here
    const threadData: SimplifiedThreadData = await client.getThread(threadId);
    
    return NextResponse.json({ 
        success: true, 
        data: { 
            thread: { 
                thread_id: threadData.thread_id,
                users: [], 
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
          if (errorMessage.includes('Session expired') || 
              errorMessage.includes('invalid') || 
              errorMessage.includes('deserialize') || 
              errorMessage.includes('login required')) {
              statusCode = 401;
          }
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
  // --- Restore Original Logic End ---
}