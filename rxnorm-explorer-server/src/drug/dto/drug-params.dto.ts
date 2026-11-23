import { Matches } from 'class-validator';

// A DTO rather than ParseIntPipe: the global ValidationPipe (transform: true)
// runs first and would turn a Number-typed '1e3' into 1000 before any param
// pipe saw it. RXAUIs are digit strings; anything else can't match one.
export class DrugParamsDto {
  @Matches(/^\d{1,12}$/, { message: 'rxaui must be an RxNorm atom id' })
  rxaui: string;
}
