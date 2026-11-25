import { Body, Controller, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  CreateUploadInputSchema,
  type ConfirmUploadResult,
  type CreateUploadInput,
  type UploadResult,
} from '@smartapp/core';
import { Can } from '../auth/decorators.js';
import { MediaService } from './media.service.js';

/** api.md "Shop": the owner's uploads, for every area (T65, T66, X7). */
@Controller('owner/uploads')
export class UploadsController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post()
  @Can('files:manage')
  @HttpCode(201)
  createUpload(
    @Body({ schema: CreateUploadInputSchema }) body: CreateUploadInput,
  ): Promise<UploadResult> {
    return this.media.createUpload(body);
  }

  @Post(':id/confirm')
  @Can('files:manage')
  @HttpCode(200)
  confirmUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ConfirmUploadResult> {
    return this.media.confirmUpload(id);
  }
}
