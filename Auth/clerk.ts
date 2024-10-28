// import { clerkClient } from './client.js';
import { clerkClient } from '@clerk/express';


export async function authenticateClerkUser(authHeader?: string): Promise<{ id: string, sessionStatus: string } | null> {
  try {
    if (!authHeader) {
      console.warn('Authorization header missing.');
      return null;
    }

    // Destructure the token from the 'Bearer <token>' string
    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      console.warn('Invalid Authorization header format.');
      return null;
    }

    console.log('Check token', token);
    // Now you have the 'token' variable containing the actual JWT
    const session = await clerkClient.sessions.getSession(token); // Use the token directly

    if (session.userId) {
      return { id: session.userId, sessionStatus: session.status };
    } else {
      console.warn('Session is invalid or user not found.');
      return null;
    }
  } catch (error: any) {
    console.error('Error verifying session:', error.message);
    return null;
  }
}
