import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  HomeRangeEnum,
  IsoDateSchema,
  type HomePeriodData,
  type HomeSummary,
  type HomeTrends,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { OwnerHomeService } from './owner-home.service.js';

const TrendsQuerySchema = z.object({ range: HomeRangeEnum });
type TrendsQuery = z.infer<typeof TrendsQuerySchema>;
const PeriodQuerySchema = z.object({ from: IsoDateSchema, to: IsoDateSchema });
type PeriodQuery = z.infer<typeof PeriodQuerySchema>;

/** api.md "Home (owner)": reads only, `shop:view` (phase 6, R16). */
@Controller('owner/home')
export class OwnerHomeController {
  constructor(@Inject(OwnerHomeService) private readonly home: OwnerHomeService) {}

  @Get()
  @Can('shop:view')
  getHome(): Promise<HomeSummary> {
    return this.home.getHome();
  }

  @Get('trends')
  @Can('shop:view')
  getTrends(@Query({ schema: TrendsQuerySchema }) query: TrendsQuery): Promise<HomeTrends> {
    return this.home.getHomeTrends(query.range);
  }

  @Get('period')
  @Can('shop:view')
  getPeriod(@Query({ schema: PeriodQuerySchema }) query: PeriodQuery): Promise<HomePeriodData> {
    return this.home.getHomePeriod(query.from, query.to);
  }
}
