import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.APP_ENV || 'development',
  name: process.env.APP_NAME || 'nestjs-standard-2026',
  port: parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
}));
