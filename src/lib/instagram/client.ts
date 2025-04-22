import { IgApiClient, IgLoginBadPasswordError, IgLoginInvalidUserError, IgLoginTwoFactorRequiredError, IgCheckpointError, IgSentryBlockError } from 'instagram-private-api';
// import { Device } from './device'; // This file doesn't exist
// import { Cookie } from 'tough-cookie'; // Unused
import { promises as fs } from 'fs';
import path from 'path';

// Define Message interface (assuming structure)
interface Message {
    item_id: string;
    user_id: number; // Assuming user_id is number based on library usage
    timestamp: string; // Keep as string from API
    item_type: string;
    // Add other relevant fields if known, e.g., text for text messages
    text?: string; 
    // Add other item types if needed (e.g., link, media)
}

// Define a type for the simplified data returned by getThread
interface SimplifiedThreadData {
  thread_id: string;
  items: Message[]; // Use the specific Message type
  viewer_id: string | null;
}

export class InstagramClient {
  public ig: IgApiClient; // Make ig public to allow direct state access
  public currentUserId: string | null = null; // Keep track of user ID if needed after deserialize
  private deviceStatePath: string;

  // Public constructor
  constructor(username?: string) {
    console.log("Creating new InstagramClient instance");
    this.ig = new IgApiClient();
    // Determine path based on username or default
    const stateDir = path.join(process.cwd(), '.instagram-state');
    const fileName = username ? `${username}.json` : 'default_state.json';
    this.deviceStatePath = path.join(stateDir, fileName);
    console.log(`Using state file: ${this.deviceStatePath}`);
    // Ensure directory exists
    fs.mkdir(stateDir, { recursive: true }).catch(console.error); 

    this.ig.state.generateDevice(username || 'default_ig_user');
  }

  private async saveState(): Promise<void> {
    const serialized = await this.ig.state.serialize();
    delete serialized.constants; // Don't save constants
    // Only save essential parts if needed to reduce size, but start with full state
    await fs.writeFile(this.deviceStatePath, JSON.stringify(serialized));
    console.log("State saved to:", this.deviceStatePath);
  }

  private async loadState(): Promise<boolean> {
    try {
      if (await fs.stat(this.deviceStatePath).then(() => true).catch(() => false)) {
        const savedState = await fs.readFile(this.deviceStatePath, 'utf8');
        await this.ig.state.deserialize(JSON.parse(savedState));
        this.currentUserId = this.ig.state.cookieUserId;
        console.log("State loaded from:", this.deviceStatePath, "User ID:", this.currentUserId);
        return true;
      }
    } catch (e: unknown) {
      console.error('Error loading state:', e);
    }
    console.log("No existing state file found or error loading.");
    return false;
  }

  async login(username: string, password: string): Promise<void> {
    console.log(`Attempting login for ${username}`);
    const stateLoaded = await this.loadState();
    if (!stateLoaded) {
      console.log("Generating new device state for login");
      // Generate device state if not loaded
      this.ig.state.generateDevice(username);
    }

    try {
      // Pre-login flow if necessary (often needed after state changes)
      // await this.ig.simulate.preLoginFlow();
      console.log("Executing login...");
      const loggedInUser = await this.ig.account.login(username, password);
      this.currentUserId = String(loggedInUser.pk); // Store user ID
      console.log("Login successful for user ID:", this.currentUserId);
      // await this.ig.simulate.postLoginFlow(); // Simulate post-login actions
      await this.saveState(); // Save state after successful login
    } catch (e: unknown) { // Change any to unknown
      console.error(`Login failed for ${username}:`, e);
      if (e instanceof IgCheckpointError) {
          console.log('Handling Checkpoint challenge...');
          await this.ig.challenge.auto(true); // Requesting sms-code or whatever challenge is present
          console.log('Checkpoint flow started, state saved.');
          await this.saveState(); // Must save state after starting challenge
          throw new Error('Checkpoint required, please verify via challenge code.');
      } else if (e instanceof IgLoginTwoFactorRequiredError) {
          console.error('Two factor required', e);
          // Here you would need to implement logic to handle 2FA
          // Maybe store the state and prompt user for code
          throw new Error('Two-factor authentication is required.');
      } else if (e instanceof IgLoginBadPasswordError || e instanceof IgLoginInvalidUserError) {
          throw new Error('Invalid username or password.');
      } else if (e instanceof IgSentryBlockError) {
          throw new Error('Login blocked by Instagram (Sentry). Try again later or from a different IP.');
      }
      // Log the error message if it's an Error instance
      if (e instanceof Error) {
          throw new Error(`Login failed: ${e.message}`);
      } else {
          throw new Error('An unknown login error occurred.');
      }
    }
  }

  // Deserializes the full state object from a string provided by the client
  async deserializeFullState(stateString: string): Promise<void> {
    console.log("Attempting deserializeFullState..."); // Log start
    if (!stateString) {
      throw new Error("Cannot deserialize empty state string.");
    }
    
    let stateObject: Record<string, unknown> | null = null; // Use unknown
    try {
        console.log("Parsing state string (first 100 chars):", stateString.substring(0, 100)); // Log parsing start
        stateObject = JSON.parse(stateString);
        // Avoid logging the full state object unless necessary, log keys instead
        console.log("State string parsed. Keys:", stateObject ? Object.keys(stateObject) : 'null object'); 
    } catch (parseError) {
        console.error("Error parsing session state JSON:", parseError);
        // Provide more context in the error
        throw new Error(`Failed to parse session state JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    try {
        if (!stateObject) {
             throw new Error("Parsed state object is null.");
        }
        console.log("Calling ig.state.deserialize with parsed object..."); 
        await this.ig.state.deserialize(stateObject); 
        
        // Check ONLY for cookieUserId after deserialize
        const userId = this.ig.state.cookieUserId;
                
        if (!userId) { 
             console.error(`CRITICAL: Deserialization seemed to succeed but state is invalid! Missing cookieUserId.`);
             throw new Error("Invalid session state after deserialize: Missing cookieUserId.");
        }
        
        this.currentUserId = userId;
        console.log(`SUCCESS: Full state deserialized. User ID set to: ${this.currentUserId}`); 

    } catch (e: unknown) {
        // Log the specific deserialization error
        console.error("Error during ig.state.deserialize:", e); 
        throw new Error(`Failed to deserialize session state into IG client: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async getInbox(): Promise<unknown> {
    console.log(`(${this.currentUserId}) Fetching inbox...`);
    if (!this.currentUserId) throw new Error("Session not properly initialized for getInbox.");
    try {
      const inboxFeed = this.ig.feed.directInbox();
      const threads = await inboxFeed.items();
      return threads;
    } catch (e: unknown) {
       console.error("Error fetching inbox:", e);
       if (this.isSessionExpiredError(e)) {
           throw new Error("Session expired or invalid.");
       }
       throw new Error("Failed to fetch inbox.");
    }
  }

  // Update method signature to use the specific return type
  async getThread(threadId: string): Promise<SimplifiedThreadData> { 
    console.log(`(${this.currentUserId}) Fetching thread ${threadId}...`);
    if (!this.currentUserId) throw new Error("Session not properly initialized for getThread.");
    try {
      const threadFeed = this.ig.feed.directThread({ thread_id: threadId, oldest_cursor: '' }); 
      const items = await threadFeed.items();
      return {
          thread_id: threadId, 
          items: items,
          viewer_id: this.currentUserId 
      };
    } catch (e: unknown) {
      console.error(`Error fetching thread ${threadId}:`, e);
       if (this.isSessionExpiredError(e)) {
           throw new Error("Session expired or invalid.");
       }
      throw new Error("Failed to fetch thread items."); 
    }
  }

  async sendMessage(threadId: string, message: string): Promise<unknown> {
    console.log(`(${this.currentUserId}) Sending message to ${threadId}...`);
    if (!this.currentUserId) throw new Error("Session not properly initialized for sendMessage.");
    try {
      const directThread = this.ig.entity.directThread(threadId);
      await directThread.broadcastText(message);
      return { success: true };
    } catch (e: unknown) {
      console.error(`Error sending message to thread ${threadId}:`, e);
       if (this.isSessionExpiredError(e)) {
           throw new Error("Session expired or invalid.");
       }
      throw new Error("Failed to send message.");
    }
  }

  // Helper to check for common session expiry errors
  // This is a basic check, might need refinement based on actual errors thrown
  private isSessionExpiredError(error: unknown): boolean {
      if (error instanceof Error) {
          // Common messages indicating session issues
          const message = error.message.toLowerCase();
          return message.includes('login required') || 
                 message.includes('checkpoint') || 
                 message.includes('session expired') || 
                 message.includes('user not found') || 
                 message.includes('deserialize'); // Treat deserialize errors as session issues
      }
      // Add checks for specific Instagram API error types if available and needed
       // Example: Check if it's an object with a specific status code
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const response = (error as { response?: { statusCode?: number } }).response;
            return response?.statusCode === 401 || response?.statusCode === 403;
        }
      return false;
  }
} 