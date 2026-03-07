#!/usr/bin/env node
/**
 * Apply the integration schema migration to remote Supabase
 * 
 * This script provides the easiest way to run the migration via Supabase Dashboard.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

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

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

const migrationPath = join(ROOT_DIR, 'supabase', 'migrations', '20260116090000_create_integrations_schema.sql');

console.log('🚀 Applying Integration Schema Migration\n');
console.log('─'.repeat(60));
console.log(`Project: ${projectRef}`);
console.log(`Migration: 20260116090000_create_integrations_schema.sql`);
console.log('─'.repeat(60));
console.log('');

// Read migration SQL
let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
  console.log(`✅ Migration file loaded (${migrationSQL.length} chars)\n`);
} catch (error) {
  console.error('❌ Could not read migration file:', migrationPath);
  console.error('   Error:', error.message);
  process.exit(1);
}

// Check migration status
console.log('🔍 Checking migration status...\n');

try {
  const output = execSync('supabase migration list --linked', { encoding: 'utf-8', stdio: 'pipe' });
  const lines = output.split('\n');
  const migrationLine = lines.find(l => l.includes('20260116090000'));
  
  if (migrationLine) {
    // Check if it's applied (has remote timestamp)
    const parts = migrationLine.split('|').map(p => p.trim());
    if (parts.length >= 3 && parts[1] && parts[1] !== '') {
      console.log('✅ Migration is already applied on remote.');
      console.log(`   Applied at: ${parts[2]}`);
      console.log('');
      console.log('💡 If the integration_providers table still doesn\'t exist,');
      console.log('   check Supabase Dashboard for errors.');
      process.exit(0);
    } else {
      console.log('⚠️  Migration exists locally but NOT applied on remote.');
    }
  } else {
    console.log('⚠️  Migration not found in migration history.');
  }
} catch (error) {
  console.log('⚠️  Could not check migration status:', error.message);
}

console.log('');

// Provide instructions
const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

console.log('📋 To apply this migration:\n');
console.log('Option 1: Via Supabase Dashboard (Recommended)');
console.log('─'.repeat(60));
console.log(`1. Open: ${dashboardUrl}`);
console.log(`2. Copy the SQL below (or from: ${migrationPath})`);
console.log('3. Paste into the SQL Editor');
console.log('4. Click "Run" or press Cmd/Ctrl + Enter');
console.log('');

// Try to open browser
try {
  const platform = process.platform;
  let command;
  
  if (platform === 'darwin') {
    command = `open "${dashboardUrl}"`;
  } else if (platform === 'win32') {
    command = `start "${dashboardUrl}"`;
  } else {
    command = `xdg-open "${dashboardUrl}"`;
  }
  
  execSync(command, { stdio: 'ignore' });
  console.log('🌐 Opened Supabase Dashboard in your browser!\n');
} catch (error) {
  console.log('💡 Open this URL in your browser:');
  console.log(`   ${dashboardUrl}\n`);
}

console.log('📋 Migration SQL:');
console.log('─'.repeat(60));
console.log(migrationSQL);
console.log('─'.repeat(60));
console.log('');

console.log('💡 After running the migration, verify with:');
console.log('   pnpm supabase:install-gohighlevel');
console.log('');
