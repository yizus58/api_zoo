import { UserRole } from './user-role';

/** What the JWT guard puts on `request.user`, loaded from the database on every request. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
