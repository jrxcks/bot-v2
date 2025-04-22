// Simple in-memory store for session state
// WARNING: This will be cleared if the server restarts!
// Use Redis or a database for production persistence.

const sessionStore = new Map<string, string>(); // Map<sessionId, serializedStateString>

export function storeSessionState(sessionId: string, state: string): void {
  console.log(`Storing state for session ID: ${sessionId}`);
  sessionStore.set(sessionId, state);
  // Optional: Add TTL logic here if needed
}

export function getSessionState(sessionId: string): string | undefined {
  console.log(`Retrieving state for session ID: ${sessionId}`);
  return sessionStore.get(sessionId);
}

export function deleteSessionState(sessionId: string): void {
  console.log(`Deleting state for session ID: ${sessionId}`);
  sessionStore.delete(sessionId);
} 