import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';
// Removed session store import
// import { getSessionState } from '@/lib/instagram/sessionStore';

// Helper function to extract state header
function getSessionState(request: Request): string | null {
    return request.headers.get('X-Instagram-State');
}

export async function GET(request: Request) {
    // Get the full state string from the custom header
    const sessionState = getSessionState(request);
    console.log("Inbox API: Received X-Instagram-State header:", sessionState ? sessionState.substring(0, 50) + '...' : 'null'); // Log first part

    if (!sessionState) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Missing session state' }, { status: 401 });
    }

    try {
        const client = new InstagramClient(); // Create instance
        // Load state using the full state string
        await client.deserializeFullState(sessionState); 

        // Fetch inbox after state is loaded
        const inboxData = await client.getInbox(); // Assuming getInbox returns the threads array directly now
        
        // Adjust return structure based on what getInbox provides
        return NextResponse.json({ success: true, data: inboxData ?? [] }); 

    } catch (e: unknown) {
        // Log the detailed error
        console.error("Inbox API Error Caught:", e instanceof Error ? e.stack : String(e)); 
        let errorMessage = "Failed to fetch inbox.";
        let statusCode = 500;

        if (e instanceof Error) {
            errorMessage = e.message;
            if (errorMessage.includes('Session expired') || errorMessage.includes('invalid') || errorMessage.includes('deserialize')) {
                statusCode = 401; 
            }
        }
        // Log the response being sent back
        console.error(`Inbox API Responding with Error: Status ${statusCode}, Message: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
    }
} 