import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpException, HttpStatus } from '@nestjs/common';

async function bootstrap() {
  if (!process.env.CORS_ALLOWED) {
    throw new HttpException(
      'CORS not configured properly',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ALLOWED?.split(','),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
