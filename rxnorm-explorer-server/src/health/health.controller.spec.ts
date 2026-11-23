import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let app: INestApplication<App>;
  const dataSource = { query: jest.fn() };

  beforeEach(async () => {
    dataSource.query.mockReset();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('is up when the database answers', async () => {
    dataSource.query.mockResolvedValue([{ 1: 1 }]);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('is unavailable, without details, when the database does not answer', async () => {
    dataSource.query.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5'));

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(503);
    expect(response.body.message).toBe('Database unavailable');
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
  });
});
