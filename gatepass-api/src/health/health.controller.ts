import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (err: unknown) {
      throw new InternalServerErrorException({
        status: 'error',
        message: (err as Error).message,
      });
    }
  }
}
