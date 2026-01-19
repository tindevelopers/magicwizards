#!/usr/bin/env node
/**
 * Sync Vercel deployment URLs to Supabase Auth configuration
 * 
 * This script:
 * 1. Gets Vercel project URLs using Vercel CLI
 * 2. Updates supabase/config.toml with those URLs
 * 3. Pushes the config to Supabase using Supabase CLI
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf-8', 
      cwd: ROOT_DIR,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.trim() : '';
  } catch (error) {
    // Check if it's actually an error or just no output
    if (error.status !== 0 && !options.silent) {
      log(`Error executing: ${command}`, 'red');
      log(error.message, 'red');
    }
    // If silent mode and it's just no output, return empty string
    if (options.silent && error.status === 0) {
      return '';
    }
    throw error;
  }
}

/**
 * Get Vercel project URLs
 */
function getVercelUrls() {
  log('🔍 Fetching Vercel project URLs...', 'blue');
  
  try {
    const projectsJson = exec('vercel project ls --json', { silent: true });
    const projects = JSON.parse(projectsJson);
    
    // Find the current project (tinadmin-saas-base-turborepo)
    const projectName = 'tinadmin-saas-base-turborepo';
    const project = projects.projects?.find(p => p.name === projectName);
    
    if (!project) {
      throw new Error(`Project "${projectName}" not found in Vercel`);
    }
    
    const productionUrl = project.latestProductionUrl;
    
    if (!productionUrl) {
      throw new Error(`No production URL found for project "${projectName}"`);
    }
    
    log(`✅ Found Vercel project: ${project.name}`, 'green');
    log(`   Production URL: ${productionUrl}`, 'green');
    
    return {
      productionUrl,
      projectName: project.name,
    };
  } catch (error) {
    log('❌ Failed to get Vercel URLs', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Make sure you are logged into Vercel:', 'yellow');
    log('   vercel login', 'yellow');
    throw error;
  }
}

/**
 * Update supabase/config.toml with Vercel URLs
 */
function updateSupabaseConfig(vercelUrls) {
  log('\n📝 Updating supabase/config.toml...', 'blue');
  
  const configPath = join(ROOT_DIR, 'supabase', 'config.toml');
  let configContent = readFileSync(configPath, 'utf-8');
  
  // Build redirect URLs list
  const redirectUrls = [
    `http://localhost:3000/**`,
    `http://localhost:3001/**`,
    `http://localhost:3002/**`,
    `${vercelUrls.productionUrl}/**`,
    `https://*.vercel.app/**`, // Allow all Vercel preview deployments
  ];
  
  // Update site_url
  configContent = configContent.replace(
    /site_url\s*=\s*["'][^"']*["']/,
    `site_url = "${vercelUrls.productionUrl}"`
  );
  
  // Update additional_redirect_urls
  const redirectUrlsString = redirectUrls.map(url => `"${url}"`).join(', ');
  configContent = configContent.replace(
    /additional_redirect_urls\s*=\s*\[[^\]]*\]/,
    `additional_redirect_urls = [${redirectUrlsString}]`
  );
  
  writeFileSync(configPath, configContent, 'utf-8');
  
  log('✅ Updated supabase/config.toml', 'green');
  log(`   Site URL: ${vercelUrls.productionUrl}`, 'green');
  log(`   Redirect URLs: ${redirectUrls.length} URLs added`, 'green');
}

/**
 * Push config to Supabase
 */
function pushToSupabase(projectRef) {
  log('\n🚀 Pushing config to Supabase...', 'blue');
  
  try {
    // First, ensure we're linked
    try {
      exec(`supabase link --project-ref ${projectRef}`, { silent: true });
      log('✅ Linked to Supabase project', 'green');
    } catch (error) {
      // Already linked, that's fine
      log('ℹ️  Already linked to Supabase project', 'yellow');
    }
    
    // Push the config (with --yes to auto-confirm)
    exec(`supabase config push --project-ref ${projectRef} --yes`);
    log('✅ Successfully pushed config to Supabase!', 'green');
  } catch (error) {
    log('❌ Failed to push config to Supabase', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Make sure you are logged into Supabase:', 'yellow');
    log('   supabase login', 'yellow');
    log(`\n💡 Or manually update in Supabase Dashboard:`, 'yellow');
    log(`   https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`, 'yellow');
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const projectRef = process.argv[2] || 'jruxnkslobykshunucwa';
  
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🔄 Syncing Vercel URLs to Supabase Auth Configuration', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(`\n📋 Supabase Project: ${projectRef}\n`, 'blue');
  
  try {
    // Step 1: Get Vercel URLs
    const vercelUrls = getVercelUrls();
    
    // Step 2: Update config.toml
    updateSupabaseConfig(vercelUrls);
    
    // Step 3: Push to Supabase
    pushToSupabase(projectRef);
    
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
    log('✅ Success! Supabase Auth URLs have been updated.', 'green');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
    log('\n📧 Password reset and magic link emails will now use:', 'blue');
    log(`   ${vercelUrls.productionUrl}`, 'green');
    log('\n💡 Test it by triggering a password reset from your Vercel deployment.', 'yellow');
    
  } catch (error) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    log('❌ Failed to sync URLs', 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    process.exit(1);
  }
}

main();
