import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without a token (every other route requires one). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
