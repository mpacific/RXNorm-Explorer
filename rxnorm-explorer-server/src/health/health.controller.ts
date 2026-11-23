import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

// For load balancers and uptime checks: up only when the database answers.
// Not throttled, since a monitor polls it from one address.
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
