import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  idParamSchema,
  listQuerySchema,
  updateStatusSchema,
  type Invoice,
  type InvoiceDetail,
  type ListQuery,
  type UpdateStatusBody,
} from './invoice.types.js';
import { InvoicesService } from './invoices.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@Query({ schema: listQuerySchema }) query: ListQuery): Invoice[] {
    return this.invoices.list(query.status);
  }

  @Get(':id')
  findOne(@Param('id', { schema: idParamSchema }) id: number): InvoiceDetail {
    return this.invoices.findOne(id);
  }

  @Patch(':id')
  updateStatus(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateStatusSchema }) body: UpdateStatusBody,
  ): InvoiceDetail {
    return this.invoices.updateStatus(id, body.status);
  }
}
