// Simple in-memory store for session state
// WARNING: This will be cleared if the server restarts!
// Use Redis or a database for production persistence.

import { kv } from "@vercel/kv";
// import { InstagramClient } from './client'; // Unused

// Store the full serialized state string in KV
// Use a reasonable TTL (Time To Live), e.g., 24 hours in seconds
const SESSION_TTL_SECONDS = 24 * 60 * 60; 

export async function storeSessionState(sessionId: string, state: string): Promise<void> {
  console.log(`Storing session state for ID: ${sessionId.substring(0, 6)}...`);
  try {
    await kv.set(sessionId, state, { ex: SESSION_TTL_SECONDS });
    console.log(`Session state stored successfully for ID: ${sessionId.substring(0, 6)}`);
  } catch (error) {
    console.error("Error storing session state in Vercel KV:", error);
    throw new Error("Failed to store session state."); // Rethrow or handle
  }
}

// Retrieve the full serialized state string from KV
export async function getSessionState(sessionId: string): Promise<string | null> {
  console.log(`Retrieving session state for ID: ${sessionId.substring(0, 6)}...`);
  try {
    const state = await kv.get<string>(sessionId);
    if (state) {
        console.log(`Session state retrieved successfully for ID: ${sessionId.substring(0, 6)}`);
    } else {
        console.warn(`No session state found in KV for ID: ${sessionId.substring(0, 6)}`);
    }
    return state; // Returns the string or null if not found/expired
  } catch (error) {
    console.error("Error retrieving session state from Vercel KV:", error);
    return null; // Return null on error
  }
}

// Optional: Function to delete session state
export async function deleteSessionState(sessionId: string): Promise<void> {
  console.log(`Deleting session state for ID: ${sessionId.substring(0, 6)}...`);
  try {
    await kv.del(sessionId);
    console.log(`Session state deleted successfully for ID: ${sessionId.substring(0, 6)}`);
  } catch (error) {
    console.error("Error deleting session state from Vercel KV:", error);
    // Decide if throwing an error is necessary
  }
} 