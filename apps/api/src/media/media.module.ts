import { Module } from '@nestjs/common';
import { MediaStorage } from './media-storage.js';
import { MediaService } from './media.service.js';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController, StorageController],
  providers: [MediaStorage, MediaService, StorageService],
  exports: [MediaService, MediaStorage],
})
export class MediaModule {}
