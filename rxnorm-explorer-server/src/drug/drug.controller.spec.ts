import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import type { Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { DrugController } from './drug.controller';
import { DrugService } from './drug.service';
import { Drug } from '../../types/drug';
import { rejectionOf } from '../test-utils/testing';

describe('DrugController', () => {
  let controller: DrugController;
  let app: INestApplication<App>;
  const drugService = { getDrug: jest.fn() };

  const drug: Drug = {
    id: 127,
    RXAUI: '1234567',
    RXCUI: '161',
    TTY: 'IN',
    STR: 'acetaminophen',
    ATV: '',
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('getDrug', () => {
    const mockResponse = () => {
      const res = { status: jest.fn(), json: jest.fn() };
      res.status.mockReturnValue(res);
      res.json.mockReturnValue(res);
      return res;
    };

    it('rejects a missing id with a 400', async () => {
      const error = await rejectionOf<HttpException>(
        controller.getDrug(0, mockResponse() as unknown as Response),
      );

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(drugService.getDrug).not.toHaveBeenCalled();
    });

    it('responds with the drug', async () => {
      drugService.getDrug.mockResolvedValue(drug);
      const res = mockResponse();

      await controller.getDrug(127, res as unknown as Response);

      expect(drugService.getDrug).toHaveBeenCalledWith(127);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(drug);
    });
  });

  describe('GET /drug/:id', () => {
    it('returns the drug as JSON', async () => {
      drugService.getDrug.mockResolvedValue(drug);

      await request(app.getHttpServer())
        .get('/drug/127')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(drug);

      // Route params arrive as strings; nothing converts them
      expect(drugService.getDrug).toHaveBeenCalledWith('127');
    });

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
        .get('/drug/127')
        .expect(500);

      expect(JSON.stringify(response.body)).not.toContain('connection lost');
    });

    it('has no route without an id', async () => {
      await request(app.getHttpServer()).get('/drug').expect(404);
      expect(drugService.getDrug).not.toHaveBeenCalled();
    });
  });
});
