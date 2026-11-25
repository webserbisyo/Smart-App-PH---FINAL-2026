import { Global, Module } from '@nestjs/common';
import { StorefrontCache } from './pages-cache.service.js';

/** Any module that changes what customers see can tell the storefront (R8). */
@Global()
@Module({
  providers: [StorefrontCache],
  exports: [StorefrontCache],
})
export class StorefrontCacheModule {}
