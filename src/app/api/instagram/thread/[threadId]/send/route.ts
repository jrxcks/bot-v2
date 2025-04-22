import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

// Helper function to extract state header
function getSessionState(request: Request): string | null {
    return request.headers.get('X-Instagram-State');
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
    const threadId = params.threadId;
    // Get the full state string from the custom header
    const sessionState = getSessionState(request);
    let message: string | undefined;

    try {
        const body = await request.json();
        message = body.message;
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!sessionState) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Missing session state' }, { status: 401 });
    }
    if (!threadId) {
        return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    try {
        const client = new InstagramClient();
        // Load state using the full state string
        await client.deserializeFullState(sessionState); 

        const result = await client.sendMessage(threadId, message.trim());

        return NextResponse.json({ success: true, data: result });

    } catch (e: unknown) {
        console.error(`Send Message API Error for ${threadId}:`, e);
        let errorMessage = `Failed to send message to thread ${threadId}.`;
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