import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'nestjs-standard-2026',
  port: parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  memoryThreshold: parseInt(process.env.CACHE_CCU_THRESHOLD || '50', 10),
  alertThreshold: parseInt(process.env.CCU_ALERT_THRESHOLD || '500', 10),
}));
