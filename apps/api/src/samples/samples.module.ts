import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { MediaModule } from '../media/media.module.js';
import { MembersModule } from '../members/members.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { SamplesController } from './samples.controller.js';
import { SamplesService } from './samples.service.js';

/** "Start with samples" and "Clear samples" (launch phase 4, X2, X4). */
@Module({
  imports: [CatalogModule, MediaModule, MembersModule, OrdersModule],
  controllers: [SamplesController],
  providers: [SamplesService],
})
export class SamplesModule {}
