import { Module } from '@nestjs/common';
import { TrackWriter } from './track-writer.js';

// The Meta outbox writer on its own, so sign-up (ShopModule) and the plan (PlatformModule) share it.
@Module({
  providers: [TrackWriter],
  exports: [TrackWriter],
})
export class TrackModule {}
