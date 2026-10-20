import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  HttpException,
  HttpStatus,
  type INestApplication,
} from '@nestjs/common';
import helmet from 'helmet';

// Split out from bootstrap so the e2e tests can apply the same middleware to
// the app they build.
export function configureApp(app: INestApplication): INestApplication {
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ALLOWED?.split(','),
    credentials: true,
  });
  return app;
}

export async function bootstrap() {
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
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

// Only start the server when run directly, not when a test imports this file.
if (require.main === module) {
  bootstrap();
}
