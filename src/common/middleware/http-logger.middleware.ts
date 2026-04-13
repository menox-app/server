import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void) {
    const { method, url } = req;
    const authHeader = req.headers['authorization'];
    
    res.on('finish', () => {
      const { statusCode } = res;
      const authStatus = authHeader ? (authHeader.toLowerCase().startsWith('bearer ') ? 'Bearer' : 'Invalid Format') : 'None';
      this.logger.log(`${method} ${url} ${statusCode} - Auth: ${authStatus}`);
    });

    next();
  }
}
