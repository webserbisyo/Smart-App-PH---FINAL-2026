import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { NewsAudiences } from './news-audience.js';
import { OwnerNewsController, ShopNewsController } from './news.controllers.js';
import { NewsSender } from './news-sender.js';
import { OwnerMembersController } from './owner-members.controller.js';
import { OwnerMembersService } from './owner-members.service.js';
import { OwnerNewsService } from './owner-news.service.js';
import { ShopNewsService } from './shop-news.service.js';

/** The owner's Members area and Push News (api.md "Members (owner)", "News (owner)", launch phase 6). */
@Module({
  imports: [OrdersModule, MediaModule],
  controllers: [OwnerMembersController, OwnerNewsController, ShopNewsController],
  providers: [OwnerMembersService, NewsAudiences, NewsSender, OwnerNewsService, ShopNewsService],
  exports: [NewsSender],
})
export class MembersModule {}
