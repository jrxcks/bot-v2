import { NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    const client = new InstagramClient(); 
    // login returns the full state object, but we only need parts of it
    const stateObject = await client.login(username, password) as any; 

    // Extract the essential authorization token
    const authToken = stateObject?.authorization;
    if (!authToken) {
        console.error("Login succeeded but no authorization token found in state object");
        throw new Error('Login failed: Missing authorization token');
    }

    // Return only the auth token (as sessionId) and user ID
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful',
      sessionId: authToken, // Send the auth token
      userId: client.currentUserId 
    });

  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    let status = 500;
    if (errorMessage.includes('Incorrect username') || errorMessage.includes('Incorrect password') || errorMessage.includes('checkpoint_required')) {
      status = 401; // Unauthorized
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: status });
  }
} 