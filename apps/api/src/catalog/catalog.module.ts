import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { CatalogReader } from './catalog-reader.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [MediaModule],
  controllers: [CatalogController],
  providers: [CatalogReader, CatalogService],
  exports: [CatalogReader, CatalogService],
})
export class CatalogModule {}
