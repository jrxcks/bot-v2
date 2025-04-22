import { IgApiClient } from 'instagram-private-api';

interface Cookie {
  key?: string;
  name?: string;
  value: string;
}

interface IgError {
  message?: string;
  name?: string;
  stack?: string;
  response?: {
    data?: any;
  };
}

export class InstagramClient {
  public ig: IgApiClient; // Make ig public to allow direct state access
  public currentUserId: string | null = null; // Keep track of user ID if needed after deserialize

  // Public constructor
  constructor() {
    console.log("Creating new InstagramClient instance");
    this.ig = new IgApiClient();
  }

  async login(username: string, password: string): Promise<object> { // Return the full state object
    try {
      // Reset client state completely on new login attempt
      this.ig = new IgApiClient(); 
      this.currentUserId = null;

      this.ig.state.generateDevice(username);
      // Optionally simulate pre-login flow
      // await this.ig.simulate.preLoginFlow(); 
      
      console.log('Attempting login...');
      const loggedInUser = await this.ig.account.login(username, password);
      this.currentUserId = String(loggedInUser.pk); // Store user ID
      console.log('Login successful for user:', loggedInUser.username, 'ID:', this.currentUserId);
      
      // Optionally simulate post-login flow
      // process.nextTick(async () => await this.ig.simulate.postLoginFlow());

      // Serialize the entire state
      const state = await this.ig.state.serialize();
      console.log('Session state serialized after login.');
      
      if (!state.authorization) {
        throw new Error('No authorization token found in serialized state after login');
      }

      // Return the raw state object, not just the sessionId
      return state; 
    } catch (error) {
      console.error('Login failed within client:', error);
      throw error; // Rethrow the original error
    }
  }

  // Methods below assume client.ig has been initialized via deserialize in the API route
  async getInbox(): Promise<any> {
     // Check if user ID exists in the deserialized state
     if (!this.ig.state.cookieUserId) { 
       throw new Error('Client state not initialized or logged out.');
     }
    
    try {
      console.log('Attempting to fetch inbox...');
      const feed = this.ig.feed.directInbox();
      const inbox = await feed.request();
      console.log(`Inbox fetched successfully. Found ${inbox?.inbox?.threads?.length ?? 0} threads.`);
      return inbox;
    } catch (error: unknown) {
      console.error('Inbox fetch error:', error);
      const igError = error as IgError;
      if (igError.name === 'IgLoginRequiredError' || igError.message?.includes('login_required')) {
         console.warn('Login required error detected during inbox fetch.');
         throw new Error('Session expired or invalid.');
      }
      console.warn('Non-session error fetching inbox, throwing.');
      throw error; // Rethrow other errors
    }
  }

  async getThread(threadId: string): Promise<any> {
     // Check if user ID exists in the deserialized state
     if (!this.ig.state.cookieUserId) {
       throw new Error('Client state not initialized or logged out.');
     }
    try {
      const feed = this.ig.feed.directThread({
        thread_id: threadId,
        oldest_cursor: '' // Or implement pagination later
      });
      const thread = await feed.request();
      return thread;
    } catch (error: unknown) {
      console.error('Failed to get thread:', error);
      const igError = error as IgError;
       if (igError.name === 'IgLoginRequiredError' || igError.message?.includes('login_required')) {
         throw new Error('Session expired');
      }
      throw error;
    }
  }

  async sendMessage(threadId: string, message: string): Promise<any> {
     // Check if user ID exists in the deserialized state
     if (!this.ig.state.cookieUserId) {
       throw new Error('Client state not initialized or logged out.');
     }
    try {
      const thread = this.ig.entity.directThread(threadId);
      const result = await thread.broadcastText(message);
      return result;
    } catch (error: unknown) { 
      console.error('Failed to send message:', error);
      const igError = error as IgError;
       if (igError.name === 'IgLoginRequiredError' || igError.message?.includes('login_required')) {
         throw new Error('Session expired');
      }
      throw error;
    }
  }
} 