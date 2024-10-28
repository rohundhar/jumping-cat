import { Session, User } from "@clerk/backend";
import { AuthStatus } from "@clerk/backend/internal";
import { ServiceContext } from "typescript-rest";

// Extend ServiceContext with Clerk's auth data
export interface ClerkContext extends ServiceContext {
  request: ServiceContext['request'] & { auth: {
    userId: string | null;
    sessionId: string | null;
    getToken: () => Promise<string | null>;
    status: AuthStatus;
    sessionClaims: any;
    user: User | undefined;
    session: Session | undefined;
} };
}
