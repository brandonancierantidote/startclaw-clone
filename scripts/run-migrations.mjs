#!/usr/bin/env node
/**
 * Run Supabase migrations directly using the REST API
 * Usage: node scripts/run-migrations.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

// Split into individual statements (simple approach)
const statements = migrationSQL
  .split(/;[\r\n]+/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);
console.log(`Supabase URL: ${SUPABASE_URL}`);

// Unfortunately, Supabase REST API doesn't support raw SQL execution
// We need to use the Management API or direct database connection
// Let's check if tables exist instead

async function checkTables() {
  const tables = ['users', 'subscriptions', 'credits', 'templates', 'agents', 'usage_logs', 'activity_feed', 'credit_transactions', 'integration_tokens'];

  console.log('\nChecking existing tables...');

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      });

      if (res.ok) {
        console.log(`✓ Table '${table}' exists`);
      } else if (res.status === 404) {
        console.log(`✗ Table '${table}' does NOT exist`);
      } else {
        const text = await res.text();
        console.log(`? Table '${table}': ${res.status} - ${text.slice(0, 100)}`);
      }
    } catch (err) {
      console.log(`? Table '${table}': Error - ${err.message}`);
    }
  }
}

checkTables().then(() => {
  console.log('\n----------------------------------------');
  console.log('To run migrations, go to Supabase Dashboard:');
  console.log(`${SUPABASE_URL.replace('.supabase.co', '')}`);
  console.log('Then: SQL Editor > New Query > Paste contents of supabase/migrations/001_initial_schema.sql');
  console.log('----------------------------------------');
});
