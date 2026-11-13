import { Global, Module } from '@nestjs/common';
import { DatabaseHealthController } from './database-health.controller';
import { databaseProviders } from './database.providers';
import { DatabaseService } from './database.service';
import { DATABASE_CLIENT } from './database.tokens';

@Global()
@Module({
  controllers: [DatabaseHealthController],
  providers: [...databaseProviders, DatabaseService],
  exports: [DATABASE_CLIENT, DatabaseService],
})
export class DatabaseModule {}
