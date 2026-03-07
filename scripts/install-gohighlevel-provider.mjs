#!/usr/bin/env node
/**
 * Install GoHighLevel integration provider in Supabase
 * 
 * This script checks if the GoHighLevel provider exists in the integration_providers table
 * and creates it if it doesn't exist.
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

  // Check if provider exists
  const { data: existing, error: checkError } = await supabase
    .from('integration_providers')
    .select('*')
    .eq('slug', 'gohighlevel')
    .maybeSingle();

  if (checkError) {
    console.error('❌ Error checking for provider:', checkError.message);
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
