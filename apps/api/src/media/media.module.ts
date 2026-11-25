import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service.js';
import { MediaStorage } from './media-storage.js';
import { MediaService } from './media.service.js';
import { ExportsController, StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController, StorageController, ExportsController],
  providers: [MediaStorage, MediaService, StorageService, ExportsService],
  exports: [MediaService, MediaStorage],
})
export class MediaModule {}
