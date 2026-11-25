import { readFileSync } from 'node:fs';
import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { isLocalDatabase } from '../env.js';
import { Db, DRIZZLE, PG_POOL, type Database } from './db.service.js';
import * as schema from './generated/schema.js';

function poolConfig(config: ConfigService): PoolConfig {
  const url = config.getOrThrow<string>('DATABASE_URL');
  const ca = config.get<string>('DATABASE_CA_CERT');
  // TLS is set below; an sslmode in the URL would override it (pg reads the URL last), so it is dropped.
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  return {
    connectionString: parsed.toString(),
    max: config.getOrThrow<number>('DB_POOL_MAX'),
    // Fail fast instead of hanging a request when the pooler is unreachable.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    // Statement time limits are set per transaction in Db.run: the transaction pooler does not pass
    // session settings from the connection's start-up through to Postgres.
    // TLS everywhere but this machine. With Supabase's certificate the server is verified too.
    ssl: isLocalDatabase(url)
      ? false
      : ca
        ? { ca: ca.includes('BEGIN CERTIFICATE') ? ca : readFileSync(ca, 'utf8') }
        : { rejectUnauthorized: false },
  };
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const pool = new Pool(poolConfig(config));
        // An idle client that dies (pooler restart) must not crash the process.
        pool.on('error', (error) => {
          new Logger('Db').warn(`Idle database connection closed: ${error.name}`);
        });
        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle({ client: pool, schema }),
    },
    Db,
  ],
  exports: [Db, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Runs after Nest stopped taking requests (enableShutdownHooks), so in-flight queries finish first.
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
