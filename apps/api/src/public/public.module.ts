import { Module } from '@nestjs/common';
import { EditorModule } from '../editor/editor.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';

/** The storefront's public routes (`/s/:slug/...`, launch phase 5). */
@Module({
  imports: [OrdersModule, EditorModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class PublicModule {}
