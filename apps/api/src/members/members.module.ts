import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { OwnerMembersController } from './owner-members.controller.js';
import { OwnerMembersService } from './owner-members.service.js';

/** The owner's Members area (api.md "Members (owner)", launch phase 6). */
@Module({
  imports: [OrdersModule, MediaModule],
  controllers: [OwnerMembersController],
  providers: [OwnerMembersService],
})
export class MembersModule {}
