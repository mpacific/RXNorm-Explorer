import { NestFactory } from '@nestjs/core';
import { HttpException } from '@nestjs/common';
import { bootstrap, configureApp } from './main';
import { AppModule } from './app.module';

// Importing main pulls in AppModule, whose data source reads its settings at
// import time. Nothing here connects to a database.
jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

describe('main', () => {
  const env = process.env;

  const mockApp = () => ({
    use: jest.fn(),
    enableCors: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
  });
  let app: ReturnType<typeof mockApp>;

  beforeEach(() => {
    process.env = {
      ...env,
      CORS_ALLOWED: 'http://localhost:3000,https://rxnorm.example',
      THROTTLE_MS: '5000',
      THROTTLE_LIMIT: '10',
      PORT: '6109',
    };
    app = mockApp();
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  describe('configureApp', () => {
    it('adds helmet', () => {
      configureApp(app as never);

      expect(app.use).toHaveBeenCalledTimes(1);
      // helmet's middleware takes (req, res, next)
      expect(app.use.mock.calls[0][0]).toHaveLength(3);
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
      expect(app.listen).toHaveBeenCalledWith('6109');
    });

    it('falls back to port 3000', async () => {
      delete process.env.PORT;

      await bootstrap();

      expect(app.listen).toHaveBeenCalledWith(3000);
    });

    it.each([
      ['CORS_ALLOWED', 'CORS not configured properly'],
      ['THROTTLE_MS', 'Throttling not configured properly'],
      ['THROTTLE_LIMIT', 'Throttling not configured properly'],
    ])('refuses to start without %s', async (variable, message) => {
      delete process.env[variable];

      await expect(bootstrap()).rejects.toThrow(
        new HttpException(message, 500),
      );
      expect(NestFactory.create).not.toHaveBeenCalled();
    });
  });
});
