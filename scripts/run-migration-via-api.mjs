#!/usr/bin/env node
/**
 * Run the integration schema migration via Supabase REST API
 * 
 * Uses the Supabase Management API to execute SQL directly.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Try to load env from apps/admin/.env.local
function loadEnv() {
  try {
    const envPath = join(ROOT_DIR, 'apps', 'admin', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Run: pnpm supabase:env:remote');
  process.exit(1);
}

async function runMigration() {
  console.log('📦 Reading migration file...\n');
  
  const migrationPath = join(ROOT_DIR, 'supabase', 'migrations', '20260116090000_create_integrations_schema.sql');
  
  let migrationSQL;
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
  } catch (error) {
    console.error('❌ Could not read migration file:', migrationPath);
    console.error('   Error:', error.message);
    process.exit(1);
  }

  console.log('🚀 Executing migration via Supabase REST API...\n');
  
  // Use Supabase REST API to execute SQL
  // Note: Supabase doesn't expose a direct SQL execution endpoint via REST API
  // We need to use the Management API or psql
  
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ Could not extract project ref from SUPABASE_URL');
    process.exit(1);
  }

  console.log(`📋 Project: ${projectRef}`);
  console.log('⚠️  Supabase REST API does not support direct SQL execution.');
  console.log('\n💡 Solution: Use Supabase Dashboard SQL Editor');
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log(`   2. Copy SQL from: ${migrationPath}`);
  console.log('   3. Paste and run');
  
  console.log('\n   Or use Supabase CLI with psql:');
  console.log('   supabase db remote get --password <password> | psql -f <migration-file>');
  
  console.log('\n📋 Migration SQL (first 1000 chars):');
  console.log('─'.repeat(60));
  console.log(migrationSQL.substring(0, 1000));
  console.log('─'.repeat(60));
  console.log('... (truncated)');
  
  process.exit(1);
}

runMigration().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
