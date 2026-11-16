import { Module } from '@nestjs/common';
import { DatabaseService } from './db/database.service.js';
import { InvoicesController } from './invoices/invoices.controller.js';
import { InvoicesService } from './invoices/invoices.service.js';
import { SeedService } from './invoices/seed.service.js';

@Module({
  controllers: [InvoicesController],
  providers: [DatabaseService, InvoicesService, SeedService],
})
export class AppModule {}
