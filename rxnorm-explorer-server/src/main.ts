import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { type INestApplication } from '@nestjs/common';
import helmet from 'helmet';

// Split out from bootstrap so the e2e tests can apply the same middleware to
// the app they build.
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ALLOWED').split(','),
    credentials: true,
  });
  return app;
}

// Settings are validated by ConfigModule (see config/env.validation.ts) when
// the app is created, so a bad or missing variable stops startup there.
export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}

// Only start the server when run directly, not when a test imports this file.
if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
