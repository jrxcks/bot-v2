import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';
import { storeSessionState } from '@/lib/instagram/sessionStore'; // Import KV store function
import crypto from 'crypto'; // For generating unique session ID

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    const client = new InstagramClient(username); // Pass username for state file handling
    await client.login(username, password);
    
    // Serialize the full state object
    const fullStateObject = await client.ig.state.serialize();
    const userId = client.currentUserId; // Get user ID after login

    if (!fullStateObject || !userId) {
        console.error("Login succeeded but failed to get full state or user ID");
        throw new Error('Login failed: Could not retrieve session details');
    }

    // Generate a unique session ID
    const sessionId = crypto.randomUUID();
    const sessionStateString = JSON.stringify(fullStateObject);

    // Store the full state string in Vercel KV
    await storeSessionState(sessionId, sessionStateString);

    // Return only the session ID and user ID to the client
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful',
      sessionId: sessionId, // Send the NEW session ID
      userId: userId 
    });

  } catch (e: unknown) {
    console.error('Login API error:', e);
    // Simplify error handling for now
    const errorMessage = e instanceof Error ? e.message : 'Login failed due to an unknown error';
    let status = 500;
    if (errorMessage.includes('Invalid username or password') || errorMessage.includes('checkpoint_required') || errorMessage.includes('Two-factor')) {
      status = 401; // Unauthorized or specific action needed
    } else if (errorMessage.includes('Sentry')) {
        status = 403; // Forbidden
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: status });
  }
} 