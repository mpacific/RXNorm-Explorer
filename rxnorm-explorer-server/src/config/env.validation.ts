// The design:type metadata tells class-transformer which settings are numbers
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

// Every setting the API reads, checked once at startup so a typo such as
// THROTTLE_MS=60s fails loudly instead of becoming NaN at runtime. Numbers
// arrive from the environment as strings and are converted here, so
// ConfigService hands back real numbers.
export class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsOptional()
  @IsString()
  ENV?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  // Comma-separated list of origins allowed to call the API
  @IsString()
  @IsNotEmpty()
  CORS_ALLOWED: string;

  @IsInt()
  @Min(1)
  THROTTLE_MS: number;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // An empty value (KEY= in .env) means "not set", so optional settings fall
  // back to their defaults rather than failing as an empty string.
  const present = Object.fromEntries(
    Object.entries(config).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  );
  const validated = plainToInstance(EnvironmentVariables, present, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const problems = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  return validated;
}
