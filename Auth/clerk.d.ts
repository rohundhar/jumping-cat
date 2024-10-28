import { AuthStatus } from './../node_modules/@clerk/backend/dist/tokens/authStatus.d';
import { Session, User } from '@clerk/backend';

declare global {
    namespace Express {
        interface Request {
            auth: {
                userId: string | null;
                sessionId: string | null;
                getToken: () => Promise<string | null>;
                status: AuthStatus;
                sessionClaims: any;
                user: User | undefined;
                session: Session | undefined;
            };
        }
    }
}