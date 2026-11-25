import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import {
  StorageFolderEnum,
  StoredFileIdsInputSchema,
  type StorageSummary,
  type StoredFileIdsInput,
  type StoredFileList,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { StorageService } from './storage.service.js';

const FolderQuerySchema = z.object({ folder: StorageFolderEnum });

/** api.md "Settings (owner)": Storage and its Files tab (T66, T93). Exports and cleanups come later. */
@Controller('owner/storage')
export class StorageController {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  @Get()
  @Can('shop:view')
  getStorage(): Promise<StorageSummary> {
    return this.storage.getStorage();
  }

  @Get('files')
  @Can('files:manage')
  listStoredFiles(
    @Query({ schema: FolderQuerySchema }) query: z.infer<typeof FolderQuerySchema>,
  ): Promise<StoredFileList> {
    return this.storage.listFiles(query.folder);
  }

  @Post('files/delete')
  @Can('files:manage')
  @HttpCode(200)
  deleteStoredFiles(
    @Body({ schema: StoredFileIdsInputSchema }) body: StoredFileIdsInput,
  ): Promise<StorageSummary> {
    return this.storage.deleteFiles(body.ids);
  }
}
