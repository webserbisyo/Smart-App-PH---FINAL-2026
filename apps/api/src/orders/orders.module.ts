import { Module } from '@nestjs/common';
import { MemberAccounts } from '../members/member-accounts.js';
import { StampLedger } from '../members/stamp-ledger.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { MediaModule } from '../media/media.module.js';
import { ShopReader } from '../public/shop-reader.js';
import { OrderBook } from './order-book.js';
import { OrderJobs } from './order-jobs.js';
import { OrderReader } from './order-reader.js';
import { OrderSteps } from './order-steps.service.js';
import { OwnerOrdersController } from './owner-orders.controller.js';
import { OwnerOrdersService } from './owner-orders.service.js';

/**
 * Orders: what every order path shares (the shop as customers see it, the order book, the order views and
 * steps) and the owner's Orders routes (api.md "Orders (owner)").
 */
@Module({
  imports: [CatalogModule, MediaModule],
  controllers: [OwnerOrdersController],
  providers: [
    ShopReader,
    OrderBook,
    OrderReader,
    OrderSteps,
    OwnerOrdersService,
    OrderJobs,
    MemberAccounts,
    StampLedger,
  ],
  exports: [ShopReader, OrderBook, OrderReader, OrderSteps, MemberAccounts, StampLedger],
})
export class OrdersModule {}
