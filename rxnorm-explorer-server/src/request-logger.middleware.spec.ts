import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestLogger } from './request-logger.middleware';

describe('requestLogger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs the method, path, status and time once the response finishes', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const res = Object.assign(new EventEmitter(), { statusCode: 404 });
    const next = jest.fn() as NextFunction;

    requestLogger(
      { method: 'GET', path: '/drug/999' } as Request,
      res as unknown as Response,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();

    res.emit('finish');
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/drug\/999 404 \d+ms$/),
    );
  });

  it('leaves out the query string, which holds what people searched for', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const res = Object.assign(new EventEmitter(), { statusCode: 200 });

    requestLogger(
      // Express's req.path never includes the query; originalUrl would
      {
        method: 'GET',
        path: '/search',
        originalUrl: '/search?searchTerm=x',
      } as Request,
      res as unknown as Response,
      jest.fn(),
    );
    res.emit('finish');

    expect(log.mock.calls[0][0]).not.toContain('searchTerm');
  });
});
