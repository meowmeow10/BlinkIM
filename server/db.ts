import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for server environment
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Clean the DATABASE_URL if it has psql command wrapper
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('psql ')) {
  connectionString = connectionString.replace(/^psql\s*'([^']+)'.*/, '$1');
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });