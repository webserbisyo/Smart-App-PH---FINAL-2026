import { Body, Controller, Delete, Get, HttpCode, Inject, Post, Put } from '@nestjs/common';
import {
  PublishStorefrontInputSchema,
  SaveStorefrontDraftInputSchema,
  type ContentVersion,
  type PreviewToken,
  type PublicShop,
  type PublishStorefrontInput,
  type SaveStorefrontDraftInput,
  type StorefrontDraftState,
} from '@smartapp/core';
import { Can } from '../auth/decorators.js';
import { ShopReader } from '../public/shop-reader.js';
import { EditorService } from './editor.service.js';

/** api.md "Editor (owner)". */
@Controller('owner/storefront')
export class EditorController {
  constructor(
    @Inject(EditorService) private readonly editor: EditorService,
    @Inject(ShopReader) private readonly shops: ShopReader,
  ) {}

  /**
   * The owner's own shop as customers see it, for the dashboard (New order, Home, the nav, Members). Works
   * before the shop is live and in help mode, where the public `/s/:slug` answers Not found (audit F-39).
   */
  @Get()
  @Can('shop:view')
  getMine(): Promise<PublicShop> {
    return this.shops.readForCustomers();
  }

  @Get('draft')
  @Can('shop:view')
  getDraft(): Promise<StorefrontDraftState> {
    return this.editor.getDraft();
  }

  @Put('draft')
  @Can('editor:manage')
  saveDraft(
    @Body({ schema: SaveStorefrontDraftInputSchema }) body: SaveStorefrontDraftInput,
  ): Promise<StorefrontDraftState> {
    return this.editor.saveDraft(body);
  }

  @Post('draft')
  @Can('editor:manage')
  @HttpCode(200)
  publish(
    @Body({ schema: PublishStorefrontInputSchema }) body: PublishStorefrontInput,
  ): Promise<ContentVersion> {
    return this.editor.publish(body);
  }

  @Delete('draft')
  @Can('editor:manage')
  discard(): Promise<ContentVersion> {
    return this.editor.discard();
  }

  @Post('preview-token')
  @Can('editor:manage')
  @HttpCode(200)
  createPreviewToken(): PreviewToken {
    return this.editor.createPreviewToken();
  }
}
