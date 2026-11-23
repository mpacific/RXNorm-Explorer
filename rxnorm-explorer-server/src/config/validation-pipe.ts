import { ValidationPipe } from '@nestjs/common';

// Applied to every route (see configureApp in main.ts). whitelist drops query
// parameters no DTO declares; transform turns validated input into the DTO
// class so its types hold at runtime.
export const createValidationPipe = (): ValidationPipe =>
  new ValidationPipe({ whitelist: true, transform: true });
