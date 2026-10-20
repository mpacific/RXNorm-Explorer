import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AppModule as AppModuleClass } from './../src/app.module';

// The throttle is read when AppModule loads, so set a small one first and
// load the module afterwards rather than importing it at the top.
describe('Throttling (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.THROTTLE_MS = '60000';
    process.env.THROTTLE_LIMIT = '3';
    const { AppModule } = jest.requireActual<{
      AppModule: typeof AppModuleClass;
    }>('./../src/app.module');

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('turns a client away with a 429 once it goes over the limit', async () => {
    const server = app.getHttpServer();

    for (let i = 0; i < 3; i++) {
      await request(server).get('/').expect(200);
    }

    const response = await request(server).get('/').expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});
