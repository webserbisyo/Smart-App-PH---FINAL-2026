import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { OwnerHomeController } from './owner-home.controller.js';
import { OwnerHomeService } from './owner-home.service.js';

/** The owner's Home (api.md "Home (owner)", launch phase 6). */
@Module({
  imports: [OrdersModule, MembersModule],
  controllers: [OwnerHomeController],
  providers: [OwnerHomeService],
})
export class HomeModule {}
