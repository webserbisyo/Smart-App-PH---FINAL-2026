import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { EditorController } from './editor.controller.js';
import { EditorService } from './editor.service.js';

@Module({
  imports: [MediaModule, OrdersModule],
  controllers: [EditorController],
  providers: [EditorService],
  exports: [EditorService],
})
export class EditorModule {}
