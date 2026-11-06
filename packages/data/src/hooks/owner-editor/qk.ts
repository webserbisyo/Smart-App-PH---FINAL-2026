// Query keys for the owner Editor. The shop comes from the login, so no key carries a slug.
export const ownerEditorQk = {
  all: ['owner-editor'] as const,
  draft: () => ['owner-editor', 'draft'] as const,
};
