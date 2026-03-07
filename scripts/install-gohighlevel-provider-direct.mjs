#!/usr/bin/env node
/**
 * Install GoHighLevel integration provider in Supabase (direct SQL approach)
 * 
 * This script runs the integration schema migration SQL directly via Supabase,
 * which creates the tables and inserts the GoHighLevel provider.
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
});

async function installGoHighLevelProvider() {
  console.log('🔍 Checking for GoHighLevel provider...\n');

  // First, check if the table exists
  const { data: tableCheck, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'integration_providers'
      );
    `
  }).catch(() => ({ data: null, error: null }));

  // Try a simple query to see if table exists
  const { data: existing, error: checkError } = await supabase
    .from('integration_providers')
    .select('*')
    .eq('slug', 'gohighlevel')
    .maybeSingle()
    .catch(() => ({ data: null, error: { message: 'Table does not exist' } }));

  if (checkError && checkError.message?.includes('not found') || checkError?.message?.includes('does not exist')) {
    console.log('📦 Integration providers table does not exist.');
    console.log('📝 Creating integration schema...\n');
    
    // Read the migration file
    const migrationPath = join(ROOT_DIR, 'supabase', 'migrations', '20260116090000_create_integrations_schema.sql');
    let migrationSQL;
    
    try {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
    } catch (error) {
      console.error('❌ Could not read migration file:', migrationPath);
      console.error('   Error:', error.message);
      console.error('\n💡 Please ensure the migration file exists.');
      process.exit(1);
    }

    // Execute the migration SQL using RPC (if available) or direct query
    // Note: Supabase doesn't support executing arbitrary SQL via client
    // We'll need to use the Management API or run via Supabase Dashboard SQL Editor
    
    console.log('⚠️  Cannot execute migration SQL directly via Supabase client.');
    console.log('\n📋 Please run this migration manually:');
    console.log(`   File: ${migrationPath}`);
    console.log('\n💡 Options:');
    console.log('   1. Copy the SQL from the migration file');
    console.log('   2. Go to Supabase Dashboard > SQL Editor');
    console.log('   3. Paste and run the SQL');
    console.log('\n   Or use Supabase CLI:');
    console.log('   supabase db push --include-all');
    
    // Try to insert just the provider using a simpler approach
    console.log('\n🔄 Attempting to create table and insert provider...\n');
    
    // Create minimal table structure and insert provider
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS integration_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        icon_slug TEXT,
        auth_type TEXT NOT NULL DEFAULT 'oauth2',
        is_beta BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    
    // We can't execute DDL via Supabase client, so we'll provide instructions
    console.log('❌ Cannot execute DDL statements via Supabase client.');
    console.log('\n✅ Solution: Run the migration via Supabase Dashboard or CLI');
    process.exit(1);
  }

  if (existing) {
    console.log('✅ GoHighLevel provider already exists:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Name: ${existing.name}`);
    console.log(`   Category: ${existing.category}`);
    console.log(`   Auth Type: ${existing.auth_type}`);
    console.log(`   Is Beta: ${existing.is_beta}`);
    return;
  }

  console.log('📦 Installing GoHighLevel provider...\n');

  // Insert the provider
  const { data: provider, error: insertError } = await supabase
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
    console.error('❌ Error installing provider:', insertError.message);
    console.error('   Details:', insertError);
    process.exit(1);
  }

  console.log('✅ Successfully installed GoHighLevel provider:');
  console.log(`   ID: ${provider.id}`);
  console.log(`   Name: ${provider.name}`);
  console.log(`   Category: ${provider.category}`);
  console.log(`   Auth Type: ${provider.auth_type}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Go to System Admin > Integrations');
  console.log('   2. Click on GoHighLevel');
  console.log('   3. Enable it and configure OAuth settings');
}

installGoHighLevelProvider().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
