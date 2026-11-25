import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import {
  CleanupKindEnum,
  StorageFolderEnum,
  StoredFileIdsInputSchema,
  type CleanupPreview,
  type StorageSummary,
  type StoredFileIdsInput,
  type StoredFileList,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { StorageService } from './storage.service.js';

const FolderQuerySchema = z.object({ folder: StorageFolderEnum });
const CleanupQuerySchema = z.object({ kind: CleanupKindEnum });
const CleanupInputSchema = z.object({ kind: CleanupKindEnum, token: z.string().min(1).max(64) });

/** api.md "Settings (owner)": Storage and its Files tab (T66, T93). Exports come with phase 6. */
@Controller('owner/storage')
export class StorageController {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  @Get()
  @Can('shop:view')
  getStorage(): Promise<StorageSummary> {
    return this.storage.getStorage();
  }

  @Get('cleanup')
  @Can('files:manage')
  previewCleanup(
    @Query({ schema: CleanupQuerySchema }) query: z.infer<typeof CleanupQuerySchema>,
  ): Promise<CleanupPreview> {
    return this.storage.previewCleanup(query.kind);
  }

  @Post('cleanup')
  @Can('files:manage')
  @HttpCode(200)
  runCleanup(
    @Body({ schema: CleanupInputSchema }) body: z.infer<typeof CleanupInputSchema>,
  ): Promise<StorageSummary> {
    return this.storage.runCleanup(body.kind, body.token);
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
