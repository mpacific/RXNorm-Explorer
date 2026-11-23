import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

// One line per request once it finishes: method, path, status and time. The
// query string is left out, since search terms are what people typed.
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.log(
      `${req.method} ${req.path} ${res.statusCode} ${ms.toFixed(0)}ms`,
    );
  });
  next();
}
