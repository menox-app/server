import 'reflect-metadata';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from '@fastify/helmet';
import compression from '@fastify/compress';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  await app.register(helmet);
  await app.register(compression);
  await app.register(multipart);

  app.enableCors();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Sử dụng API_PREFIX từ config (.env)
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Kiểm tra môi trường bằng NODE_ENV thay vì APP_ENV
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  if (nodeEnv !== 'production') {
    const appName = configService.get<string>('APP_NAME') || 'NestJS API';
    const config = new DocumentBuilder()
      .setTitle(appName)
      .setDescription('The API description for ' + appName)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  app.enableShutdownHooks();

  await app.init();
  return app;
}

bootstrap().then(async (app) => {
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT') || 3000;
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}/v1`);
  console.log(`📑 Swagger UI available at: http://localhost:${port}/api-docs`);
});
