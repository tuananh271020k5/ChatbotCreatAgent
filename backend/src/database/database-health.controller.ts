import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../shared/decorators/public.decorator';
import { DatabaseService } from './database.service';

interface ReadinessResponse {
  status: 'ready';
  checks: {
    database: 'up';
  };
}

@Public()
@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('ready')
  async readiness(): Promise<ReadinessResponse> {
    if (!(await this.databaseService.isReady())) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: { database: 'down' },
      });
    }

    return {
      status: 'ready',
      checks: { database: 'up' },
    };
  }
}
