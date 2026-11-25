// The per-area switch (decision T116): which areas a build takes from NestJS. Kept out of env.ts so the
// storefront, which reads none of it yet, does not bundle these schemas (its JS budget, T31).
import { z } from 'zod';
import type { AppEnv, DataSource } from './env';

// Areas wired to NestJS so far (decision T116, per-area switch). A sample-data build can take some areas from
// the API (staging: `VITE_API_AREAS=ownerAuth,onboarding,uploads,ownerSettings,ownerEditor`) while the rest stay on
// sample data. The list grows phase by phase; a live build never mixes (see dataPlan).
export const API_AREAS = [
  'ownerAuth',
  'onboarding',
  'uploads',
  'ownerSettings',
  'ownerEditor',
] as const;
export const ApiAreaEnum = z.enum(API_AREAS);
export type ApiArea = z.infer<typeof ApiAreaEnum>;

export const ApiAreasSchema = z
  .string()
  .default('')
  .transform((raw) =>
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  )
  .pipe(z.array(ApiAreaEnum));

export interface DataPlan {
  source: DataSource;
  apiAreas: ReadonlySet<ApiArea>;
}

/**
 * Which areas come from the API. A live build (production) must be all API: it refuses to start on sample
 * data, so a paying shop can never see a fake order or member.
 */
export function dataPlan(
  source: DataSource,
  apiAreas: readonly ApiArea[],
  appEnv: AppEnv,
): DataPlan {
  if (appEnv === 'production' && source !== 'api') {
    throw new Error('A live build cannot use sample data: set DATA_SOURCE=api.');
  }
  return {
    source,
    apiAreas: new Set(source === 'api' ? API_AREAS : apiAreas),
  };
}

export function usesApi(plan: DataPlan, area: ApiArea): boolean {
  return plan.apiAreas.has(area);
}
