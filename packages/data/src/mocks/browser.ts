// The browser's mock back end; what the customer creates is kept on the phone.
// Loaded on first use (adapters/lazy.ts), so the shop packs stay out of first-load JS.
import { GLOBAL_SCOPE, getDeviceStorage } from '../device-storage';
import { createMockStore, type MockStore } from './store';

let mockStore: MockStore | null = null;

export function getMockStore(): MockStore {
  mockStore ??= createMockStore({
    persistence: {
      load: () => getDeviceStorage().mockState.read(GLOBAL_SCOPE).value,
      save: (data) => getDeviceStorage().mockState.write(GLOBAL_SCOPE, data),
    },
  });
  return mockStore;
}
