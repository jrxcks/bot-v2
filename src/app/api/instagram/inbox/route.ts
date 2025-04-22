import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';
// Removed session store import
// import { getSessionState } from '@/lib/instagram/sessionStore';

// Helper function to extract Auth Token (Session ID)
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(request: Request) {
  let client: InstagramClient | null = null;
  try {
    // Get the AUTH TOKEN from the header
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing authorization token' }, { status: 401 });
    }

    // Create new client instance
    client = new InstagramClient();
    
    // Deserialize using ONLY the auth token and basic device info
    // The library might regenerate other needed state based on this
    try {
        console.log('Inbox route: Deserializing with token:', authToken);
        await client.ig.state.deserialize({ 
            authorization: authToken,
            // Add minimal, consistent device info (same as used in login potentially)
            deviceString: 'iPhone14,3', 
            deviceId: 'ios-14.3' 
            // NOTE: Avoid adding things like UUID/PhoneID/ADID here unless known to be stable
            // and captured during login and stored client-side (which adds complexity).
            // The library might regenerate necessary session cookies based on the auth token.
        });
        console.log('Inbox route: Session state deserialized.');
    } catch (deserializeError) {
         console.error("Failed to deserialize state:", deserializeError);
         // If deserialize fails, it's likely an invalid token
         return NextResponse.json({ success: false, error: 'Invalid or expired session token' }, { status: 401 });
    }

    // Verify state after deserialize using cookieUserId
    if (!client.ig.state.cookieUserId) {
        console.error('Inbox route: Deserialized state appears invalid (missing cookieUserId).');
        throw new Error('Deserialized state is invalid or expired.');
    }
    client.currentUserId = client.ig.state.cookieUserId;
    console.log('Inbox route: State valid for user:', client.currentUserId);

    const inboxData = await client.getInbox();
    
    return NextResponse.json({
      success: true,
      data: inboxData?.inbox?.threads || [] 
    });

  } catch (error) {
    console.error('Inbox fetch API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching inbox';
    let status = 500;
    if (errorMessage.includes('Session expired') || errorMessage.includes('not initialized') || errorMessage.includes('invalid or expired')) {
      status = 401; 
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: []
    }, { status: status });
  }
} 