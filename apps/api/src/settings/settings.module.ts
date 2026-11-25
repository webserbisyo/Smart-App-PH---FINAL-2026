import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [MediaModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
