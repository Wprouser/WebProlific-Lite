import { config } from 'dotenv';
import { resolve } from 'path';

// Runs before any test file (and therefore before AppModule/PrismaService)
// is imported — see jest-e2e.json's `setupFiles`. override:true so this
// wins even though ConfigModule.forRoot() later loads .env too (dotenv
// never overwrites an already-set var by default, so ordering here is
// what actually matters, not what AppModule does internally).
//
// In CI, .env.test won't exist (it's gitignored, same as .env) — dotenv's
// config() just no-ops on a missing file, so DATABASE_URL falls back to
// whatever the CI job already set as a real environment variable.
config({ path: resolve(__dirname, '../.env.test'), override: true });
