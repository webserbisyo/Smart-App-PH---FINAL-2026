// Drizzle reads the database's shape from the local Supabase (decision T116, Q9): the SQL migrations in
// supabase/migrations stay the only source of truth, and `pnpm --filter @smartapp/api db:pull` writes the
// TypeScript mirror into src/db/generated. Never run drizzle-kit generate, migrate or push.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/generated',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
});
