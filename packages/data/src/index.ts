export * from './auth';
export * from './api-client';
export * from './hooks/auth';
export type * from './database.types';
export * from './device-storage';
export * from './adapters/types';
export { createAdapters, DataProvider, resetDemoData, useAdapters } from './adapters/index';
export * from './env';
export * from './hooks/storefront/qk';
export * from './hooks/storefront/device';
export * from './hooks/storefront/queries';
export * from './hooks/storefront/provider';
export {
  DEMO_CUSTOMER,
  DEMO_RECEIPTS,
  DEMO_RECEIPT_TOKENS,
  demoBasketLines,
  type DemoReceiptToken,
} from './mocks/activity';
export { isDevMock, type MockScenario } from './mocks/scenario-state';
export { loadMockScenario, readMockScenarioFromUrl, type UrlScenario } from './mocks/scenario';
export * from './compress-image';
export { useQueryClient } from '@tanstack/react-query';
