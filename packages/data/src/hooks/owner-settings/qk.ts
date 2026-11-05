// Query keys for owner Settings (T64 to T68). The shop comes from the login, so no key carries a slug.
export const ownerSettingsQk = {
  all: ['owner-settings'] as const,
  settings: () => ['owner-settings', 'settings'] as const,
  profile: () => ['owner-settings', 'profile'] as const,
  notifications: () => ['owner-settings', 'notifications'] as const,
  plan: () => ['owner-settings', 'plan'] as const,
  storage: () => ['owner-settings', 'storage'] as const,
  cleanup: (kind: string) => ['owner-settings', 'cleanup', kind] as const,
  export: (id: string) => ['owner-settings', 'export', id] as const,
};
