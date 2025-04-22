import { NextRequest, NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

// Helper function to extract auth token from Authorization header
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
    const threadId = params.threadId;
    const authToken = getAuthToken(request);
    let message: string | undefined;

    try {
        const body = await request.json();
        message = body.message;
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!authToken) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Missing auth token' }, { status: 401 });
    }
    if (!threadId) {
        return NextResponse.json({ success: false, error: 'Missing thread ID' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    try {
        const client = new InstagramClient();
        
        // Create a state object with just the auth token
        const stateObj = {
            cookies: [
                {
                    key: 'authorization',
                    value: authToken,
                    domain: 'i.instagram.com',
                    path: '/',
                    hostOnly: true,
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
        
        // Serialize the state object to JSON
        const stateString = JSON.stringify(stateObj);
        
        // Use the existing deserializeFullState method
        await client.deserializeFullState(stateString);

        const result = await client.sendMessage(threadId, message.trim());

        return NextResponse.json({ success: true, data: result });

    } catch (e: unknown) {
        console.error(`Send Message API Error for ${threadId}:`, e);
        let errorMessage = `Failed to send message to thread ${threadId}.`;
        let statusCode = 500;

        if (e instanceof Error) {
            errorMessage = e.message;
            // Check for session/authentication errors
            if (errorMessage.includes('Session expired') || 
                errorMessage.includes('invalid') || 
                errorMessage.includes('deserialize') ||
                errorMessage.includes('login')) {
                statusCode = 401; // Unauthorized
            }
        }
        return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
    }
} 