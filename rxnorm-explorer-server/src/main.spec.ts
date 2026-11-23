import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { bootstrap, configureApp } from './main';
import { AppModule } from './app.module';

// Importing main pulls in AppModule, whose data source reads its settings at
// import time. Nothing here connects to a database.
jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

describe('main', () => {
  // What the validated ConfigService would hold
  const settings: Record<string, unknown> = {
    CORS_ALLOWED: 'http://localhost:3000,https://rxnorm.example',
    PORT: 6109,
  };

  const mockApp = () => ({
    use: jest.fn(),
    useGlobalPipes: jest.fn(),
    enableCors: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
    get: jest.fn((token: unknown) => {
      expect(token).toBe(ConfigService);
      return { getOrThrow: (key: string) => settings[key] };
    }),
  });
  let app: ReturnType<typeof mockApp>;

  beforeEach(() => {
    app = mockApp();
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('configureApp', () => {
    it('adds helmet', () => {
      configureApp(app as never);

      expect(app.use).toHaveBeenCalledTimes(1);
      // helmet's middleware takes (req, res, next)
      expect(app.use.mock.calls[0][0]).toHaveLength(3);
    });

    it('validates every request', () => {
      configureApp(app as never);

      expect(app.useGlobalPipes).toHaveBeenCalledWith(
        expect.objectContaining({
          isTransformEnabled: true,
          validatorOptions: expect.objectContaining({ whitelist: true }),
        }),
      );
    });

    it('allows each configured origin', () => {
      configureApp(app as never);

      expect(app.enableCors).toHaveBeenCalledWith({
        origin: ['http://localhost:3000', 'https://rxnorm.example'],
        credentials: true,
      });
    });

    it('returns the app it was given', () => {
      expect(configureApp(app as never)).toBe(app);
    });
  });

  describe('bootstrap', () => {
    it('creates, configures and starts the app on PORT', async () => {
      await bootstrap();

      expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
      expect(app.use).toHaveBeenCalled();
      expect(app.enableCors).toHaveBeenCalled();
      expect(app.listen).toHaveBeenCalledWith(6109);
    });

    // Missing or malformed settings are caught by ConfigModule's validation
    // (see config/env.validation.spec.ts), which runs inside create()
    it('fails when the app cannot be created', async () => {
      jest
        .spyOn(NestFactory, 'create')
        .mockRejectedValue(new Error('Invalid environment configuration'));

      await expect(bootstrap()).rejects.toThrow(
        'Invalid environment configuration',
      );
      expect(app.listen).not.toHaveBeenCalled();
    });
  });
});
