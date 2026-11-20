import * as baseline from './20260101000000-baseline';
import * as integrityAndIndexes from './20260101000100-integrity-and-indexes';

/** Ordered list of migrations. Add new ones at the end; never edit an applied one. */
export const MIGRATIONS = [baseline, integrityAndIndexes];
