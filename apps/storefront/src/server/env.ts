import {
  ApiAreasSchema,
  ApiUrlSchema,
  dataPlan,
  ServerSecretSchema,
} from '@smartapp/data/api-areas';
import { appEnv, dataSource } from '@/env';

// Checked on the server at start (rule 9); the browser side reads the same values as plain text.
export const apiUrl = ApiUrlSchema.parse(process.env.NEXT_PUBLIC_API_URL || undefined);
const apiAreas = ApiAreasSchema.parse(process.env.NEXT_PUBLIC_API_AREAS || undefined);

// DATA_SOURCE=api takes every area; a live build refuses sample data (dataPlan).
export const storefrontOnApi = dataPlan(dataSource, apiAreas, appEnv).apiAreas.has('storefront');

// Shared with NestJS (launch phase 5): server reads skip its per-address rate limit, and only NestJS may
// ask this storefront to drop a shop's cached pages. Never NEXT_PUBLIC_: they stay on the server.
export const serverReadSecret = ServerSecretSchema.parse(process.env.SERVER_READ_SECRET);
export const revalidateSecret = ServerSecretSchema.parse(process.env.STOREFRONT_REVALIDATE_SECRET);
