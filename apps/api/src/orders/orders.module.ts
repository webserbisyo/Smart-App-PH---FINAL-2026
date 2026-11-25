import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { MediaModule } from '../media/media.module.js';
import { ShopReader } from '../public/shop-reader.js';
import { OrderBook } from './order-book.js';
import { OrderReader } from './order-reader.js';

/** What every order path shares: the shop as customers see it, the order book and the order views. */
@Module({
  imports: [CatalogModule, MediaModule],
  providers: [ShopReader, OrderBook, OrderReader],
  exports: [ShopReader, OrderBook, OrderReader],
})
export class OrdersModule {}
