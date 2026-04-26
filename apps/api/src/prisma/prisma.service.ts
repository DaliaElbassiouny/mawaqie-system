import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      const message = (err as Error).message;

      if (message.includes('the URL must start with the protocol `prisma://`')) {
        this.logger.error(
          'Prisma Client was generated in no-engine/Accelerate mode. Regenerate it for direct PostgreSQL local development and keep DATABASE_URL as postgresql://...',
          message,
        );
      } else {
        this.logger.error('Database connection failed - check DATABASE_URL', message);
      }

      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
