import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpException, HttpStatus } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  if (!process.env.CORS_ALLOWED) {
    throw new HttpException(
      'CORS not configured properly',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  if (!process.env.THROTTLE_MS || !process.env.THROTTLE_LIMIT) {
    throw new HttpException(
      'Throttling not configured properly',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ALLOWED?.split(','),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
