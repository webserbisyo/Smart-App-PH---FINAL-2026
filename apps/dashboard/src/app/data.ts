// The dashboard's data for this build (decision T116): sample data, or NestJS for the areas listed in
// VITE_API_AREAS (all of them with VITE_DATA_SOURCE=api). Made once here so route guards, outside React, use
// the same adapters and login as the screens.
import { createAdapters, createOwnerAuth, planOf, type AdapterOptions } from '@smartapp/data';
import { env } from './env.js';

const options: AdapterOptions = {
  apiUrl: env.VITE_API_URL,
  apiAreas: env.VITE_API_AREAS,
  appEnv: env.VITE_APP_ENV,
};

export const dataPlan = planOf(env.VITE_DATA_SOURCE, options);
export const adapters = createAdapters(env.VITE_DATA_SOURCE, options);
export const ownerAuth = createOwnerAuth(env.VITE_DATA_SOURCE, options);

/** Shops come from the API (staging and live): the owner's real shop, never a sample one. */
export const realShops = dataPlan.apiAreas.has('onboarding');
