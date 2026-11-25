import { Body, Controller, Delete, HttpCode, Inject, Post } from '@nestjs/common';
import type { PublicShop } from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { SamplesService } from './samples.service.js';

const ApplyInputSchema = z.object({ packSlug: z.string().min(1).max(40) });

/** api.md "Samples (owner)": "Start with samples" and "Clear samples" (launch phase 4, X4). */
@Controller('owner/samples')
export class SamplesController {
  constructor(@Inject(SamplesService) private readonly samples: SamplesService) {}

  @Post()
  @Can('menu:manage')
  @HttpCode(200)
  applySamplePack(
    @Body({ schema: ApplyInputSchema }) body: z.infer<typeof ApplyInputSchema>,
  ): Promise<PublicShop> {
    return this.samples.apply(body.packSlug);
  }

  @Delete()
  @Can('menu:manage')
  @HttpCode(200)
  clearSamples(): Promise<PublicShop> {
    return this.samples.clear();
  }
}
