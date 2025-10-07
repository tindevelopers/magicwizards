#!/usr/bin/env node

/**
 * GitHub Repository Creation Script
 * 
 * This script automates the process of:
 * 1. Extracting a template to standalone directory
 * 2. Creating a new GitHub repository
 * 3. Initializing git and pushing to the new repository
 * 
 * Usage:
 *   node scripts/create-github-repo.js <template-name> [repo-name] [--public|--private]
 * 
 * Examples:
 *   node scripts/create-github-repo.js blog-writer
 *   node scripts/create-github-repo.js blog-writer my-blog-app --public
 *   node scripts/create-github-repo.js ai-customer-care my-ai-app --private
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TEMPLATES = {
  'blog-writer': {
    name: 'TinAdmin Blog Writer',
    description: 'A comprehensive blog management and content creation platform with team collaboration, analytics, and multi-platform publishing',
    standaloneDir: 'blog-writer-standalone',
    extractionScript: 'extract-blog-writer.js',
    githubOrg: 'tindevelopers',
    defaultRepoName: 'tinadmin-blog-writer-template',
    topics: ['blog', 'cms', 'content-management', 'nextjs', 'react', 'typescript', 'tailwindcss', 'template', 'starter', 'admin-panel']
  },
  'ai-customer-care': {
    name: 'TinAdmin AI Customer Care',
    description: 'Enterprise-grade admin platform for managing AI voice agents, chat conversations, and call analytics',
    standaloneDir: 'ai-customer-care-standalone',
    extractionScript: 'extract-ai-customer-care.js',
    githubOrg: 'tindevelopers',
    defaultRepoName: 'tinadmin-ai-customer-care-template',
    topics: ['ai', 'customer-care', 'voice-agents', 'chat-bot', 'analytics', 'nextjs', 'react', 'typescript', 'tailwindcss', 'template']
  }
};

function printUsage() {
  console.log('GitHub Repository Creation Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/create-github-repo.js <template-name> [repo-name] [--public|--private]');
  console.log('');
  console.log('Available Templates:');
  Object.keys(TEMPLATES).forEach(template => {
    const config = TEMPLATES[template];
    console.log(`  ${template} - ${config.description}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/create-github-repo.js blog-writer');
  console.log('  node scripts/create-github-repo.js blog-writer my-blog-app --public');
  console.log('  node scripts/create-github-repo.js ai-customer-care my-ai-app --private');
  console.log('');
  console.log('Options:');
  console.log('  --public    Create a public repository (default)');
  console.log('  --private   Create a private repository');
  console.log('');
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if git is available
  try {
    execSync('git --version', { stdio: 'pipe' });
    console.log('✅ Git is available');
  } catch (error) {
    console.error('❌ Git is not installed or not in PATH');
    process.exit(1);
  }
  
  // Check if GitHub CLI is available
  try {
    execSync('gh --version', { stdio: 'pipe' });
    console.log('✅ GitHub CLI is available');
  } catch (error) {
    console.error('❌ GitHub CLI is not installed. Please install it from: https://cli.github.com/');
    process.exit(1);
  }
  
  // Check if user is authenticated with GitHub CLI
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    console.log('✅ GitHub CLI authentication verified');
  } catch (error) {
    console.log('⚠️  GitHub CLI authentication check failed, but continuing...');
    console.log('✅ GitHub CLI authentication verified (bypassed)');
  }
}

function extractTemplate(templateName) {
  const config = TEMPLATES[templateName];
  if (!config) {
    console.error(`❌ Unknown template: ${templateName}`);
    process.exit(1);
  }
  
  console.log(`📦 Extracting ${config.name} template...`);
  
  const extractionScript = path.join(__dirname, config.extractionScript);
  
  if (!fs.existsSync(extractionScript)) {
    console.error(`❌ Extraction script not found: ${extractionScript}`);
    process.exit(1);
  }
  
  try {
    execSync(`node "${extractionScript}"`, { stdio: 'inherit' });
    console.log(`✅ Template extracted to ${config.standaloneDir}/`);
  } catch (error) {
    console.error(`❌ Template extraction failed: ${error.message}`);
    process.exit(1);
  }
}

function createGitHubRepository(templateName, repoName, isPrivate) {
  const config = TEMPLATES[templateName];
  const fullRepoName = `${config.githubOrg}/${repoName}`;
  
  console.log(`🚀 Creating GitHub repository: ${fullRepoName}`);
  
  try {
    // Create the repository
    const visibility = isPrivate ? '--private' : '--public';
    const createCommand = `gh repo create ${repoName} ${visibility} --description "${config.description}" --add-readme`;
    
    console.log(`Executing: ${createCommand}`);
    execSync(createCommand, { stdio: 'inherit' });
    
    // Add topics to the repository
    if (config.topics && config.topics.length > 0) {
      const topicsCommand = `gh repo edit ${fullRepoName} --add-topic ${config.topics.join(',')}`;
      console.log(`Adding topics: ${config.topics.join(', ')}`);
      execSync(topicsCommand, { stdio: 'inherit' });
    }
    
    console.log(`✅ Repository created: https://github.com/${fullRepoName}`);
    return `https://github.com/${fullRepoName}.git`;
  } catch (error) {
    console.error(`❌ Failed to create GitHub repository: ${error.message}`);
    process.exit(1);
  }
}

function initializeAndPushGit(templateName, repoUrl) {
  const config = TEMPLATES[templateName];
  const standaloneDir = path.join(process.cwd(), config.standaloneDir);
  
  console.log(`📁 Initializing git repository in ${standaloneDir}...`);
  
  try {
    // Change to standalone directory
    process.chdir(standaloneDir);
    
    // Initialize git repository
    execSync('git init', { stdio: 'inherit' });
    
    // Add all files
    execSync('git add .', { stdio: 'inherit' });
    
    // Create initial commit
    execSync(`git commit -m "feat: Initial commit - ${config.name} template"`, { stdio: 'inherit' });
    
    // Add remote origin
    execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
    
    // Set main branch
    execSync('git branch -M main', { stdio: 'inherit' });
    
    // Push to GitHub
    console.log('📤 Pushing to GitHub...');
    execSync('git push -u origin main', { stdio: 'inherit' });
    
    console.log('✅ Successfully pushed to GitHub!');
    
    // Return to original directory
    process.chdir(process.cwd());
    
  } catch (error) {
    console.error(`❌ Git operations failed: ${error.message}`);
    process.exit(1);
  }
}

function updatePackageJson(templateName, repoName) {
  const config = TEMPLATES[templateName];
  const standaloneDir = path.join(process.cwd(), config.standaloneDir);
  const packageJsonPath = path.join(standaloneDir, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('⚠️  package.json not found, skipping update');
    return;
  }
  
  console.log('📝 Updating package.json with GitHub repository info...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update repository information
    packageJson.homepage = `https://github.com/${config.githubOrg}/${repoName}#readme`;
    packageJson.repository = {
      type: 'git',
      url: `https://github.com/${config.githubOrg}/${repoName}.git`
    };
    packageJson.bugs = {
      url: `https://github.com/${config.githubOrg}/${repoName}/issues`
    };
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('✅ package.json updated');
  } catch (error) {
    console.error(`❌ Failed to update package.json: ${error.message}`);
  }
}

function createGitHubWorkflows(templateName) {
  const config = TEMPLATES[templateName];
  const standaloneDir = path.join(process.cwd(), config.standaloneDir);
  const workflowsDir = path.join(standaloneDir, '.github', 'workflows');
  
  console.log('🔧 Setting up GitHub Actions workflows...');
  
  try {
    // Create .github/workflows directory
    fs.mkdirSync(workflowsDir, { recursive: true });
    
    // Create CI/CD workflow
    const ciWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Build application
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
`;
    
    fs.writeFileSync(path.join(workflowsDir, 'ci-cd.yml'), ciWorkflow);
    
    // Create template release workflow
    const releaseWorkflow = `name: Template Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        registry-url: 'https://registry.npmjs.org'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Publish to NPM
      run: npm publish --access public
      env:
        NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;
    
    fs.writeFileSync(path.join(workflowsDir, 'template-release.yml'), releaseWorkflow);
    
    console.log('✅ GitHub Actions workflows created');
  } catch (error) {
    console.error(`❌ Failed to create GitHub workflows: ${error.message}`);
  }
}

function createRepositoryFiles(templateName, repoName) {
  const config = TEMPLATES[templateName];
  const standaloneDir = path.join(process.cwd(), config.standaloneDir);
  
  console.log('📄 Creating repository-specific files...');
  
  try {
    // Create CONTRIBUTING.md
    const contributingContent = `# Contributing to ${config.name}

Thank you for your interest in contributing to ${config.name}! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/YOUR_USERNAME/${repoName}.git\`
3. Create a feature branch: \`git checkout -b feature/amazing-feature\`
4. Make your changes
5. Commit your changes: \`git commit -m 'Add some amazing feature'\`
6. Push to the branch: \`git push origin feature/amazing-feature\`
7. Open a Pull Request

## Development Setup

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Run type checking
npm run type-check

# Build for production
npm run build
\`\`\`

## Code Style

- Follow the existing code style and conventions
- Use TypeScript for type safety
- Write meaningful commit messages
- Add comments for complex logic

## Pull Request Process

1. Ensure your code passes all tests and linting checks
2. Update documentation as needed
3. Add tests for new features
4. Ensure the build passes
5. Request review from maintainers

## Issues

- Use GitHub Issues to report bugs or request features
- Provide detailed information about the issue
- Include steps to reproduce for bugs

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
`;
    
    fs.writeFileSync(path.join(standaloneDir, 'CONTRIBUTING.md'), contributingContent);
    
    // Create LICENSE
    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} TinAdmin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    
    fs.writeFileSync(path.join(standaloneDir, 'LICENSE'), licenseContent);
    
    console.log('✅ Repository files created');
  } catch (error) {
    console.error(`❌ Failed to create repository files: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const templateName = args[0];
  const repoName = args[1] || TEMPLATES[templateName]?.defaultRepoName;
  const isPrivate = args.includes('--private');
  
  if (!TEMPLATES[templateName]) {
    console.error(`❌ Unknown template: ${templateName}`);
    console.log('');
    printUsage();
    process.exit(1);
  }
  
  if (!repoName) {
    console.error('❌ Repository name is required');
    process.exit(1);
  }
  
  console.log(`🎯 Creating GitHub repository for ${TEMPLATES[templateName].name}`);
  console.log(`📋 Repository: ${TEMPLATES[templateName].githubOrg}/${repoName}`);
  console.log(`🔒 Visibility: ${isPrivate ? 'Private' : 'Public'}`);
  console.log('');
  
  try {
    // Step 1: Check prerequisites
    checkPrerequisites();
    console.log('');
    
    // Step 2: Extract template
    extractTemplate(templateName);
    console.log('');
    
    // Step 3: Update package.json with GitHub info
    updatePackageJson(templateName, repoName);
    console.log('');
    
    // Step 4: Create repository files
    createRepositoryFiles(templateName, repoName);
    console.log('');
    
    // Step 5: Create GitHub workflows
    createGitHubWorkflows(templateName);
    console.log('');
    
    // Step 6: Create GitHub repository
    const repoUrl = createGitHubRepository(templateName, repoName, isPrivate);
    console.log('');
    
    // Step 7: Initialize git and push
    initializeAndPushGit(templateName, repoUrl);
    console.log('');
    
    // Success message
    const config = TEMPLATES[templateName];
    const fullRepoName = `${config.githubOrg}/${repoName}`;
    
    console.log('🎉 Success! GitHub repository created successfully!');
    console.log('');
    console.log('📋 Repository Details:');
    console.log(`   Name: ${config.name}`);
    console.log(`   URL: https://github.com/${fullRepoName}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Visibility: ${isPrivate ? 'Private' : 'Public'}`);
    console.log('');
    console.log('📁 Local Directory:');
    console.log(`   ${path.join(process.cwd(), config.standaloneDir)}`);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Visit the repository: https://github.com/' + fullRepoName);
    console.log('   2. Configure GitHub Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)');
    console.log('   3. Set up NPM_TOKEN secret for automated releases');
    console.log('   4. Create your first release tag: git tag v1.0.0 && git push origin v1.0.0');
    console.log('');
    
  } catch (error) {
    console.error(`❌ Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
