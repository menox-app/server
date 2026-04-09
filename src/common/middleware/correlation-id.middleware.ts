import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    
    // Fastify response object uses 'header' or 'setHeader'
    if (typeof res.header === 'function') {
      res.header('X-Correlation-Id', correlationId);
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('X-Correlation-Id', correlationId);
    }
    
    next();
  }
}
