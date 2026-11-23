import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DrugController } from './drug.controller';
import { DrugService } from './drug.service';
import { Drug } from '../types/drug';
import { createValidationPipe } from '../config/validation-pipe';

describe('DrugController', () => {
  let controller: DrugController;
  let app: INestApplication<App>;
  const drugService = { getDrug: jest.fn() };

  const drug: Drug = {
    RXAUI: '1234567',
    RXCUI: '161',
    TTY: 'IN',
    STR: 'acetaminophen',
    NDCs: [],
    RelatedDrugs: [],
  };

  beforeEach(async () => {
    drugService.getDrug.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrugController],
      providers: [{ provide: DrugService, useValue: drugService }],
    }).compile();

    controller = module.get<DrugController>(DrugController);
    // The 500 test throws on purpose; keep its stack trace out of the output
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('getDrug', () => {
    it('returns the drug', async () => {
      drugService.getDrug.mockResolvedValue(drug);

      await expect(controller.getDrug({ rxaui: '1234567' })).resolves.toBe(
        drug,
      );
      expect(drugService.getDrug).toHaveBeenCalledWith('1234567');
    });
  });

  describe('GET /drug/:rxaui', () => {
    it('returns the drug as JSON', async () => {
      drugService.getDrug.mockResolvedValue(drug);

      await request(app.getHttpServer())
        .get('/drug/1234567')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(drug);

      expect(drugService.getDrug).toHaveBeenCalledWith('1234567');
    });

    // Before validation, MySQL coerced '127abc' to 127 and returned that drug
    it.each(['127abc', 'abc', '1.5', '1e3', '-1', '1'.repeat(13)])(
      'rejects something that is not an RXAUI (%p) with a 400',
      async (id) => {
        await request(app.getHttpServer()).get(`/drug/${id}`).expect(400);
        expect(drugService.getDrug).not.toHaveBeenCalled();
      },
    );

    it('returns a 404 when there is no such drug', async () => {
      drugService.getDrug.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/drug/999').expect(404).expect({
        statusCode: 404,
        message: 'Drug not found',
      });
    });

    it('returns a 500 without details when the lookup fails', async () => {
      drugService.getDrug.mockRejectedValue(new Error('connection lost'));

      const response = await request(app.getHttpServer())
        .get('/drug/1234567')
        .expect(500);

      expect(JSON.stringify(response.body)).not.toContain('connection lost');
    });

    it('has no route without an RXAUI', async () => {
      await request(app.getHttpServer()).get('/drug').expect(404);
      expect(drugService.getDrug).not.toHaveBeenCalled();
    });
  });
});
