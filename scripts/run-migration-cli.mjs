#!/usr/bin/env node
/**
 * Run the integration schema migration via Supabase CLI + psql
 * 
 * This script attempts to execute the migration SQL file using psql
 * connected to the remote Supabase database.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
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

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL');
  console.error('\n💡 Run: pnpm supabase:env:remote');
  process.exit(1);
}

// Extract project ref
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

const migrationPath = join(ROOT_DIR, 'supabase', 'migrations', '20260116090000_create_integrations_schema.sql');

console.log('📦 Migration file:', migrationPath);
console.log('🔗 Project:', projectRef);
console.log('');

// Check if migration already applied
console.log('🔍 Checking migration status...\n');

try {
  const { execSync } = await import('child_process');
  const output = execSync('supabase migration list --linked', { encoding: 'utf-8', stdio: 'pipe' });
  
  if (output.includes('20260116090000')) {
    const lines = output.split('\n');
    const migrationLine = lines.find(l => l.includes('20260116090000'));
    
    if (migrationLine && migrationLine.includes('|') && !migrationLine.includes('|                |')) {
      console.log('✅ Migration 20260116090000 is already applied on remote.');
      console.log('   Line:', migrationLine.trim());
      console.log('\n💡 If the integration_providers table still doesn\'t exist,');
      console.log('   the migration may have failed. Check Supabase Dashboard logs.');
      process.exit(0);
    }
  }
  
  console.log('⚠️  Migration 20260116090000 is NOT applied on remote.');
  console.log('');
} catch (error) {
  console.log('⚠️  Could not check migration status:', error.message);
  console.log('');
}

console.log('📋 To run this migration, you have two options:\n');

console.log('Option 1: Via Supabase Dashboard (Recommended)');
console.log('─'.repeat(60));
console.log(`1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log(`2. Copy the SQL from: ${migrationPath}`);
console.log('3. Paste and click "Run"');
console.log('');

console.log('Option 2: Via psql (if you have database password)');
console.log('─'.repeat(60));
console.log('Run this command (replace <PASSWORD> with your database password):');
console.log('');
console.log(`psql "postgresql://postgres.<PASSWORD>@db.${projectRef}.supabase.co:5432/postgres" -f ${migrationPath}`);
console.log('');
console.log('Or use Supabase CLI:');
console.log(`supabase db remote get --password <PASSWORD> | psql -f ${migrationPath}`);
console.log('');

console.log('📋 Migration SQL preview (first 500 chars):');
console.log('─'.repeat(60));
const migrationSQL = readFileSync(migrationPath, 'utf-8');
console.log(migrationSQL.substring(0, 500));
console.log('─'.repeat(60));
console.log('... (full SQL in file)');
console.log('');

console.log('💡 After running the migration, verify with:');
console.log('   pnpm supabase:install-gohighlevel');
