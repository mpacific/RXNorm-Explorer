import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { type INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { createValidationPipe } from './config/validation-pipe';
import { requestLogger } from './request-logger.middleware';

// Split out from bootstrap so the e2e tests can apply the same middleware to
// the app they build.
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService);

  app.use(helmet());
  app.useGlobalPipes(createValidationPipe());
  // No credentials: the API uses no cookies or auth, so allowing them would
  // only widen what an allowed origin's scripts could do.
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ALLOWED').split(','),
  });
  return app;
}

// Settings are validated by ConfigModule (see config/env.validation.ts) when
// the app is created, so a bad or missing variable stops startup there.
export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Close the database pool cleanly on SIGTERM/SIGINT (deploys, Ctrl-C)
  app.enableShutdownHooks();
  // Here rather than in configureApp, to keep it out of the tests' output
  app.use(requestLogger);
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
