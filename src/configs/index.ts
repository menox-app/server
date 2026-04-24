import appConfig from './app.config';
import cloudinaryConfig from './cloudinary.config';
import redisConfig from './redis.config';

export * from './validation.schema';
export const configs = [appConfig, cloudinaryConfig, redisConfig];
