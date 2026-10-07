import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as accessible without a JWT (all other routes require one). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
