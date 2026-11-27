import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import {
  CleanupKindEnum,
  CreateExportInputSchema,
  StorageFolderEnum,
  StoredFileIdsInputSchema,
  type CleanupPreview,
  type CreateExportInput,
  type DataExport,
  type FilesDownload,
  type StorageSummary,
  type StoredFileIdsInput,
  type StoredFileList,
} from '@smartapp/core';
import { z } from 'zod';
import { Can, NotInHelp } from '../auth/decorators.js';
import { ExportsService } from './exports.service.js';
import { StorageService } from './storage.service.js';

const FolderQuerySchema = z.object({ folder: StorageFolderEnum });
const CleanupQuerySchema = z.object({ kind: CleanupKindEnum });
const CleanupInputSchema = z.object({ kind: CleanupKindEnum, token: z.string().min(1).max(64) });

/** api.md "Settings (owner)": Storage and its Files tab (T66, T93). */
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
  @NotInHelp()
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
  @NotInHelp()
  @Can('files:manage')
  @HttpCode(200)
  deleteStoredFiles(
    @Body({ schema: StoredFileIdsInputSchema }) body: StoredFileIdsInput,
  ): Promise<StorageSummary> {
    return this.storage.deleteFiles(body.ids);
  }

  @Post('files/download')
  @Can('files:manage')
  @HttpCode(200)
  downloadStoredFiles(
    @Body({ schema: StoredFileIdsInputSchema }) body: StoredFileIdsInput,
  ): Promise<FilesDownload> {
    return this.storage.downloadFiles(body.ids);
  }
}

/** api.md "Settings (owner)": the saved copy of orders and payments (T66, phase 6). */
@Controller('owner/exports')
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exports: ExportsService) {}

  @Post()
  @Can('files:manage')
  @HttpCode(200)
  createExport(
    @Body({ schema: CreateExportInputSchema }) body: CreateExportInput,
  ): Promise<DataExport> {
    return this.exports.create(body);
  }

  @Get(':id')
  @Can('files:manage')
  getExport(@Param('id') id: string): Promise<DataExport> {
    return this.exports.get(id);
  }
}
