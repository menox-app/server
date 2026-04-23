import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Create decorator for public optional
export const IS_PUBLIC_OPTIONAL_KEY = 'isPublicOptional';
export const PublicOptional = () => SetMetadata(IS_PUBLIC_OPTIONAL_KEY, true);