import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { AccountDeleteService } from './account-delete.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [MediaModule],
  controllers: [SettingsController],
  providers: [SettingsService, AccountDeleteService],
})
export class SettingsModule {}
