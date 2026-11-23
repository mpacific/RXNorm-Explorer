import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';

// RxNorm data only changes with the monthly release, so successful responses
// can be reused for an hour by browsers and shared caches.
export const CACHE_CONTROL = 'public, max-age=3600';

// Sets Cache-Control only once the handler has succeeded. @Header() can't be
// used: Nest applies it before the handler runs, so a 400 or 404 would be
// cached too.
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        context
          .switchToHttp()
          .getResponse<Response>()
          .setHeader('Cache-Control', CACHE_CONTROL);
      }),
    );
  }
}
