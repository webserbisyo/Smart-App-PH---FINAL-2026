import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaModule } from '../media/media.module.js';
import { PushModule } from '../push/push.module.js';
import { ShopModule } from '../shop/shop.module.js';
import { AdminController } from './admin.controller.js';
import { AdminReader } from './admin-reader.js';
import { AdminService } from './admin.service.js';
import { HttpMetaGraph, MetaGraph, RecordingMetaGraph } from './meta-graph.js';
import { MetaSender } from './meta-sender.js';
import { OwnerPlanController } from './owner-plan.controller.js';
import { OwnerPlanService } from './owner-plan.service.js';
import { PlanJobs } from './plan-jobs.js';
import { PlanReader } from './plan-reader.js';
import { TrackModule } from './track.module.js';

/**
 * Launch phase 7 (T118): the owner's Plan, Super Admin, help mode, plan reminders and the Meta outbox
 * sender. Meta's Graph API only with a pixel id and token; without them events are recorded and wait.
 */
@Module({
  imports: [MediaModule, PushModule, ShopModule, TrackModule],
  controllers: [OwnerPlanController, AdminController],
  providers: [
    PlanReader,
    OwnerPlanService,
    AdminReader,
    AdminService,
    MetaSender,
    PlanJobs,
    {
      provide: MetaGraph,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MetaGraph => {
        const pixel = config.get<string>('META_PIXEL_ID');
        const token = config.get<string>('META_CAPI_TOKEN');
        const version = config.get<string>('META_GRAPH_VERSION') ?? 'v27.0';
        if (pixel && token) return new HttpMetaGraph(pixel, token, version);
        return new RecordingMetaGraph(false);
      },
    },
  ],
  exports: [MetaSender, MetaGraph],
})
export class PlatformModule {}
