import { Matches } from 'class-validator';

// A DTO rather than ParseIntPipe: the global ValidationPipe (transform: true)
// runs first and would turn a Number-typed '1e3' into 1000 before any param
// pipe saw it. Without this check MySQL coerces '127abc' to 127.
export class DrugParamsDto {
  @Matches(/^\d+$/, { message: 'id must be a whole number' })
  id: string;
}
