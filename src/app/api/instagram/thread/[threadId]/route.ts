import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

// Helper function to extract Auth Token
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  let client: InstagramClient | null = null;
  try {
    const threadId = params.threadId;
    if (!threadId) {
      return NextResponse.json({ success: false, error: 'Thread ID is required' }, { status: 400 });
    }

    // Get AUTH TOKEN
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing authorization token' }, { status: 401 });
    }

    client = new InstagramClient();
    
    // Deserialize using token and basic device info
    try {
        console.log(`Get Thread (${threadId}): Deserializing with token:`, authToken);
        await client.ig.state.deserialize({ 
            authorization: authToken,
            deviceString: 'iPhone14,3',
            deviceId: 'ios-14.3'
        });
        console.log(`Get Thread (${threadId}): Session state deserialized.`);
    } catch (deserializeError) {
         console.error("Failed to deserialize state:", deserializeError);
         return NextResponse.json({ success: false, error: 'Invalid or expired session token' }, { status: 401 });
    }

    if (!client.ig.state.cookieUserId) {
        console.error(`Get Thread (${threadId}): Deserialized state appears invalid.`);
        throw new Error('Deserialized state is invalid or expired.');
    }
    client.currentUserId = client.ig.state.cookieUserId;
    console.log(`Get Thread (${threadId}): State valid for user:`, client.currentUserId);

    const threadData = await client.getThread(threadId);

    return NextResponse.json({ success: true, data: threadData });

  } catch (error) {
    console.error(`Thread fetch API error (ID: ${params.threadId}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching thread';
    let status = 500;
    if (errorMessage.includes('Session expired') || errorMessage.includes('not initialized') || errorMessage.includes('invalid or expired')) {
      status = 401;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: null
    }, { status: status });
  }
}