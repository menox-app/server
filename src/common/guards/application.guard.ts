import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpThrottlerGuard } from './throttler.guard';
import { CcuInterceptor } from '../interceptors/ccu.interceptor';

/**
 * ApplicationGuards
 * Tập hợp toàn bộ các Guard và Interceptor toàn cục của hệ thống.
 * Giúp AppModule luôn sạch sẽ và dễ quản lý.
 */
export const ApplicationGuards = [
  {
    provide: APP_INTERCEPTOR,
    useClass: CcuInterceptor,
  },
  {
    provide: APP_GUARD,
    useClass: HttpThrottlerGuard,
  },
];
