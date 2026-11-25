import { Module } from '@nestjs/common';
import { EditorModule } from '../editor/editor.module.js';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { MapsController } from './maps.controller.js';
import { MapsService } from './maps.service.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';

/** The storefront's public routes (`/s/:slug/...`, launch phase 5). */
@Module({
  imports: [OrdersModule, EditorModule, MediaModule],
  controllers: [StorefrontController, ReceiptsController, MapsController],
  providers: [StorefrontService, ReceiptsService, MapsService],
})
export class PublicModule {}
