import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      name: 'NestJS Social Infrastructure API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
