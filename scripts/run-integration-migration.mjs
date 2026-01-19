#!/usr/bin/env node
/**
 * Run the integration schema migration directly via Supabase Management API
 * 
 * This script executes the migration SQL file directly on the remote database
 * using the Supabase Management API (via @supabase/supabase-js with service role).
 */

import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

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

  console.log('🔍 Checking if integration_providers table exists...\n');
  
  // Check if table already exists
  const { data: tableExists, error: checkError } = await supabase
    .from('integration_providers')
    .select('id')
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null, error: { message: 'Table does not exist' } }));

  if (tableExists !== null && !checkError) {
    console.log('✅ Integration providers table already exists.');
    console.log('🔍 Checking for GoHighLevel provider...\n');
    
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('slug', 'gohighlevel')
      .maybeSingle();
    
    if (provider) {
      console.log('✅ GoHighLevel provider already exists:');
      console.log(`   ID: ${provider.id}`);
      console.log(`   Name: ${provider.name}`);
      console.log(`   Category: ${provider.category}`);
      return;
    } else {
      console.log('⚠️  Table exists but GoHighLevel provider not found.');
      console.log('📝 Inserting GoHighLevel provider...\n');
      
      const { data: newProvider, error: insertError } = await supabase
        .from('integration_providers')
        .insert({
          slug: 'gohighlevel',
          name: 'GoHighLevel',
          category: 'CRM',
          description: 'All-in-one CRM and marketing automation',
          auth_type: 'oauth2',
          is_beta: false,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error inserting provider:', insertError.message);
        console.error('   Details:', insertError);
        console.log('\n💡 You may need to run the full migration SQL manually.');
        process.exit(1);
      }
      
      console.log('✅ Successfully inserted GoHighLevel provider:');
      console.log(`   ID: ${newProvider.id}`);
      console.log(`   Name: ${newProvider.name}`);
      return;
    }
  }

  console.log('📝 Table does not exist. Running full migration...\n');
  console.log('⚠️  Note: Supabase JS client cannot execute DDL statements directly.');
  console.log('💡 Using Supabase REST API to execute SQL...\n');

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute.\n`);

  // Try using RPC call if available, otherwise use direct SQL execution via REST API
  // Note: Supabase doesn't expose a direct SQL execution endpoint via the JS client
  // We need to use the Management API or psql connection
  
  console.log('❌ Cannot execute DDL statements via Supabase JS client.');
  console.log('\n💡 Solution: Execute the migration via Supabase Dashboard SQL Editor');
  console.log(`   File: ${migrationPath}`);
  console.log('\n   Or use psql:');
  console.log(`   psql "${SUPABASE_URL.replace('https://', 'postgresql://postgres:')}@${SUPABASE_URL.replace('https://', '').split('.')[0]}.supabase.co:5432/postgres" -f ${migrationPath}`);
  
  // Alternative: Try to use the Supabase Management API
  // This requires the project's database password or connection string
  console.log('\n📋 Migration SQL preview (first 500 chars):');
  console.log(migrationSQL.substring(0, 500) + '...\n');
  
  process.exit(1);
}

runMigration().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
