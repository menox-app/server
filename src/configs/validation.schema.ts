import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  APP_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  APP_NAME: Joi.string().required(),
  APP_PORT: Joi.number().port().default(3000),

  // Database (Prisma)
  DATABASE_URL: Joi.string().uri().required(),

  // Security
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.number().default(3600),
});
