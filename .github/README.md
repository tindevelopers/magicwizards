# GitHub Actions CI/CD

This repository includes automated CI/CD workflows for building, testing, and deploying the TinAdmin application.

## Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `develop` or `main` branches
- Pull requests to `develop` or `main` branches

**Jobs:**
- **Test**: Runs type checking, linting, building, and template extraction tests
- **Deploy Preview**: Deploys preview builds for pull requests
- **Deploy Production**: Deploys to production when pushing to `main`

### 2. Deploy to Vercel (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `develop` or `main` branches
- Pull requests to `develop` or `main` branches

**Features:**
- Automated Vercel deployment
- Production builds for main branch
- Preview deployments for pull requests

## Required Secrets

To enable Vercel deployment, add these secrets to your GitHub repository:

1. **VERCEL_TOKEN**: Your Vercel API token
   - Get it from: https://vercel.com/account/tokens

2. **VERCEL_ORG_ID**: Your Vercel organization ID
   - Get it from: https://vercel.com/account/settings

3. **VERCEL_PROJECT_ID**: Your Vercel project ID
   - Get it from your project settings in Vercel

## Setup Instructions

1. **Connect Vercel to GitHub:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Configure build settings (already configured in `vercel.json`)

2. **Add GitHub Secrets:**
   - Go to your GitHub repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Add the three required secrets mentioned above

3. **Enable GitHub Actions:**
   - Go to your repository "Actions" tab
   - Enable workflows if prompted

## Deployment Flow

- **Pull Requests**: Creates preview deployments for testing
- **Push to `develop`**: Runs tests and creates preview deployment
- **Push to `main`**: Runs tests and deploys to production

## Local Development

To test the CI/CD pipeline locally:

```bash
# Install dependencies
npm ci

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build application
npm run build

# Test template extraction
node scripts/extract-blog-writer.js ./test-blog-writer
cd test-blog-writer && npm install && npm run build
cd .. && rm -rf test-blog-writer
```
# CI/CD Test - Tue Oct  7 20:44:06 CEST 2025
# Vercel Deployment Test - Tue Oct  7 21:10:04 CEST 2025
