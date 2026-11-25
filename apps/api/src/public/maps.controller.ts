import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { LatLng } from '@smartapp/core';
import { z } from 'zod';
import { NoTransaction, Public } from '../auth/decorators.js';
import { MapsService } from './maps.service.js';

const ResolveInputSchema = z.object({ url: z.string().min(1).max(2000) }).strict();
type ResolveInput = z.infer<typeof ResolveInputSchema>;

// Each call can reach Google: a tighter limit than the storefront's reads.
const MAPS_LIMIT = { default: { limit: 30, ttl: 60_000 } };

/** api.md `resolveMapsLink`: a pasted Google Maps link to its pin (R18). No database. */
@Controller('maps')
@Public()
@NoTransaction()
export class MapsController {
  constructor(@Inject(MapsService) private readonly maps: MapsService) {}

  @Post('resolve')
  @HttpCode(200)
  @Throttle(MAPS_LIMIT)
  resolve(@Body({ schema: ResolveInputSchema }) body: ResolveInput): Promise<LatLng> {
    return this.maps.resolve(body.url);
  }
}
