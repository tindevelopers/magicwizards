#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Template Builder Script
 * Builds and packages templates for distribution
 */

function buildTemplate(templateType) {
  console.log(`🔨 Building ${templateType} template...`);

  const templateDir = path.join(__dirname, '..', 'templates', templateType);
  const buildDir = path.join(__dirname, '..', 'dist', templateType);

  if (!fs.existsSync(templateDir)) {
    console.error(`❌ Template "${templateType}" not found.`);
    process.exit(1);
  }

  // Create build directory
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Copy template files
  copyTemplateFiles(templateDir, buildDir);
  
  // Install dependencies
  installDependencies(buildDir);
  
  // Build the template
  buildTemplate(buildDir);
  
  // Create package.json for NPM
  createPackageJson(buildDir, templateType);
  
  console.log(`✅ ${templateType} template built successfully!`);
  console.log(`📦 Ready for NPM publish: ${buildDir}`);
}

function copyTemplateFiles(sourceDir, targetDir) {
  // Copy all template files to build directory
  execSync(`cp -r ${sourceDir}/* ${targetDir}/`, { stdio: 'inherit' });
}

function installDependencies(buildDir) {
  console.log('📦 Installing dependencies...');
  process.chdir(buildDir);
  execSync('npm install', { stdio: 'inherit' });
}

function buildTemplate(buildDir) {
  console.log('🔨 Building template...');
  execSync('npm run build', { stdio: 'inherit' });
}

function createPackageJson(buildDir, templateType) {
  const packageJson = {
    name: `@tinadmin/template-${templateType}`,
    version: '1.0.0',
    description: `TinAdmin ${templateType} dashboard template`,
    main: 'dist/index.js',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    keywords: ['dashboard', 'admin', 'template', templateType],
    author: 'TIN Developers',
    license: 'MIT',
    dependencies: {
      // Will be populated from the template's package.json
    }
  };

  fs.writeFileSync(
    path.join(buildDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

// CLI usage
const templateType = process.argv[2];
if (!templateType) {
  console.log('Usage: node build-template.js <template-type>');
  process.exit(1);
}

buildTemplate(templateType);
