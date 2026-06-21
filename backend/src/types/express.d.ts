// backend/src/types/express.d.ts
/**
 * Extend Express.Request so middleware can attach `user` and `locale`
 * and downstream handlers see them with full typing.
 */
import type { LocaleCode } from '../config/constants';
import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      role: UserRole;
    }
    interface Request {
      user?: AuthenticatedUser;
      locale: LocaleCode;
    }
  }
}

export {};
