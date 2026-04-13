import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  APP_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  APP_NAME: Joi.string().default('nestjs-standard-2026'),
  APP_PORT: Joi.number().port().allow('', null).optional(),
  PORT: Joi.number().port().allow('', null).optional(),

  // Database (Prisma)
  DATABASE_URL: Joi.string().uri().required(),

  // Security
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth (Optional)
  GOOGLE_CLIENT_ID: Joi.string().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().allow(''),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
});
