import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/user-role';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Without it any authenticated user may call the route. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
