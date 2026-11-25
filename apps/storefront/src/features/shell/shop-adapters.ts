import { createShopAdapters } from '@smartapp/data';
import { apiAreas, apiUrl, appEnv, dataSource } from '@/env';

// The shop pages' adapters, made once (launch phase 5): NestJS per area, else sample data (left undefined, the
// provider's own). next.config.ts writes SMARTAPP_TAKES_API into the build, so a sample-data build drops this
// code and the API adapter's loader entirely (the shop pages' JS budget).
export const shopAdapters =
  process.env.SMARTAPP_TAKES_API === '1'
    ? createShopAdapters(dataSource, { apiUrl, apiAreas, appEnv })
    : undefined;
