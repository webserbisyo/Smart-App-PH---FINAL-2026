import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  AvailabilityEnum,
  BulkItemsInputSchema,
  CategoryDraftSchema,
  IsoDateTimeSchema,
  ItemDraftSchema,
  ItemStatusEnum,
  OptionGroupDraftSchema,
  SaveVariantTemplateInputSchema,
  SortOrderInputSchema,
  type BulkItemsInput,
  type BulkItemsResult,
  type Category,
  type CategoryDraft,
  type ItemDraft,
  type OptionGroupDraft,
  type OwnerItem,
  type OwnerOptionGroup,
  type OwnerVariantTemplate,
  type RemoveVariantTemplateResult,
  type SaveVariantTemplateInput,
  type SaveVariantTemplateResult,
  type SortOrderInput,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { CatalogReader } from './catalog-reader.js';
import { CatalogService } from './catalog.service.js';

const StatusInputSchema = z.object({ status: ItemStatusEnum });
const SoldOutInputSchema = z.object({
  availability: AvailabilityEnum,
  soldOutUntil: IsoDateTimeSchema.nullable().optional(),
});

interface Ok {
  ok: true;
}
const OK: Ok = { ok: true };

/** api.md "Catalog (owner)" (launch phase 4, T117). The shop is the caller's; ids are checked as its own. */
@Controller('owner')
export class CatalogController {
  constructor(
    @Inject(CatalogReader) private readonly reader: CatalogReader,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get('categories')
  @Can('shop:view')
  listCategories(): Promise<Category[]> {
    return this.reader.listCategories();
  }

  @Post('categories')
  @Can('menu:manage')
  createCategory(@Body({ schema: CategoryDraftSchema }) body: CategoryDraft): Promise<Category> {
    return this.catalog.saveCategory(null, body);
  }

  @Put('categories/:id')
  @Can('menu:manage')
  saveCategory(
    @Param('id') id: string,
    @Body({ schema: CategoryDraftSchema }) body: CategoryDraft,
  ): Promise<Category> {
    return this.catalog.saveCategory(id, body);
  }

  @Delete('categories/:id')
  @Can('menu:manage')
  async removeCategory(@Param('id') id: string): Promise<Ok> {
    await this.catalog.removeCategory(id);
    return OK;
  }

  @Get('items')
  @Can('shop:view')
  listItems(): Promise<OwnerItem[]> {
    return this.reader.listItems();
  }

  @Post('items')
  @Can('menu:manage')
  createItem(@Body({ schema: ItemDraftSchema }) body: ItemDraft): Promise<OwnerItem> {
    return this.catalog.saveItem(null, body);
  }

  // Before items/:id so "bulk" is never read as an id.
  @Post('items/bulk')
  @Can('menu:manage')
  @HttpCode(200)
  bulkItems(@Body({ schema: BulkItemsInputSchema }) body: BulkItemsInput): Promise<BulkItemsResult> {
    return this.catalog.bulk(body);
  }

  @Put('items/:id')
  @Can('menu:manage')
  saveItem(
    @Param('id') id: string,
    @Body({ schema: ItemDraftSchema }) body: ItemDraft,
  ): Promise<OwnerItem> {
    return this.catalog.saveItem(id, body);
  }

  @Delete('items/:id')
  @Can('menu:manage')
  async removeItem(@Param('id') id: string): Promise<Ok> {
    await this.catalog.removeItem(id);
    return OK;
  }

  @Patch('items/:id/status')
  @Can('menu:manage')
  setItemStatus(
    @Param('id') id: string,
    @Body({ schema: StatusInputSchema }) body: z.infer<typeof StatusInputSchema>,
  ): Promise<OwnerItem> {
    return this.catalog.setItemStatus(id, body.status);
  }

  @Patch('variants/:id')
  @Can('menu:manage')
  setSoldOut(
    @Param('id') id: string,
    @Body({ schema: SoldOutInputSchema }) body: z.infer<typeof SoldOutInputSchema>,
  ): Promise<OwnerItem> {
    return this.catalog.setSoldOut(id, body.availability, body.soldOutUntil ?? null);
  }

  @Get('option-groups')
  @Can('shop:view')
  listOptionGroups(): Promise<OwnerOptionGroup[]> {
    return this.reader.listOptionGroups();
  }

  @Post('option-groups')
  @Can('menu:manage')
  createOptionGroup(
    @Body({ schema: OptionGroupDraftSchema }) body: OptionGroupDraft,
  ): Promise<OwnerOptionGroup> {
    return this.catalog.saveOptionGroup(null, body);
  }

  @Put('option-groups/:id')
  @Can('menu:manage')
  saveOptionGroup(
    @Param('id') id: string,
    @Body({ schema: OptionGroupDraftSchema }) body: OptionGroupDraft,
  ): Promise<OwnerOptionGroup> {
    return this.catalog.saveOptionGroup(id, body);
  }

  @Delete('option-groups/:id')
  @Can('menu:manage')
  async removeOptionGroup(@Param('id') id: string): Promise<Ok> {
    await this.catalog.removeOptionGroup(id);
    return OK;
  }

  @Get('variant-templates')
  @Can('shop:view')
  listVariantTemplates(): Promise<OwnerVariantTemplate[]> {
    return this.reader.listTemplates();
  }

  @Post('variant-templates')
  @Can('menu:manage')
  @HttpCode(200)
  createVariantTemplate(
    @Body({ schema: SaveVariantTemplateInputSchema }) body: SaveVariantTemplateInput,
  ): Promise<SaveVariantTemplateResult> {
    return this.catalog.saveVariantTemplate(null, body);
  }

  @Put('variant-templates/:id')
  @Can('menu:manage')
  saveVariantTemplate(
    @Param('id') id: string,
    @Body({ schema: SaveVariantTemplateInputSchema }) body: SaveVariantTemplateInput,
  ): Promise<SaveVariantTemplateResult> {
    return this.catalog.saveVariantTemplate(id, body);
  }

  @Delete('variant-templates/:id')
  @Can('menu:manage')
  removeVariantTemplate(@Param('id') id: string): Promise<RemoveVariantTemplateResult> {
    return this.catalog.removeVariantTemplate(id);
  }

  @Put('sort')
  @Can('menu:manage')
  async saveSortOrder(@Body({ schema: SortOrderInputSchema }) body: SortOrderInput): Promise<Ok> {
    await this.catalog.saveSortOrder(body);
    return OK;
  }
}
