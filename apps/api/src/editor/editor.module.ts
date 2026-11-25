import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { EditorController } from './editor.controller.js';
import { EditorService } from './editor.service.js';

@Module({
  imports: [MediaModule],
  controllers: [EditorController],
  providers: [EditorService],
})
export class EditorModule {}
