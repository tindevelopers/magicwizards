# GitHub Repository Creation Guide

This guide explains how to use the automated GitHub repository creation script to extract templates and create standalone GitHub repositories.

## 📋 Overview

The `create-github-repo.js` script automates the entire process of:
1. **Extracting** a template to a standalone directory
2. **Creating** a new GitHub repository
3. **Setting up** git repository and pushing code
4. **Configuring** GitHub Actions workflows
5. **Adding** repository-specific files (LICENSE, CONTRIBUTING.md)

## 🚀 Quick Start

### Prerequisites

Before running the script, ensure you have:

1. **Git** installed and configured
2. **GitHub CLI** installed: [Install GitHub CLI](https://cli.github.com/)
3. **GitHub CLI authenticated**: `gh auth login`

### Basic Usage

```bash
# Create a GitHub repository for the blog writer template
npm run template:github blog-writer

# Create with custom repository name
npm run template:github blog-writer my-blog-app

# Create a private repository
npm run template:github blog-writer my-blog-app --private
```

### Available Templates

| Template | Description | Default Repository Name |
|----------|-------------|------------------------|
| `blog-writer` | Comprehensive blog management platform | `tinadmin-blog-writer-template` |
| `ai-customer-care` | Enterprise AI customer care platform | `tinadmin-ai-customer-care-template` |

## 📖 Detailed Usage

### Command Syntax

```bash
node scripts/create-github-repo.js <template-name> [repo-name] [--public|--private]
```

### Parameters

- **`<template-name>`** (required): The template to extract (`blog-writer` or `ai-customer-care`)
- **`[repo-name]`** (optional): Custom repository name (defaults to template default)
- **`--public`** (default): Create a public repository
- **`--private`**: Create a private repository

### Examples

```bash
# Extract blog writer template with default repository name
node scripts/create-github-repo.js blog-writer

# Extract blog writer template with custom name
node scripts/create-github-repo.js blog-writer my-awesome-blog

# Extract AI customer care template as private repository
node scripts/create-github-repo.js ai-customer-care my-ai-platform --private

# Using npm script (recommended)
npm run template:github blog-writer my-blog-app --public
```

## 🔧 What the Script Does

### 1. Prerequisites Check
- ✅ Verifies Git is installed
- ✅ Verifies GitHub CLI is installed
- ✅ Verifies GitHub CLI authentication

### 2. Template Extraction
- 📦 Runs the appropriate extraction script
- 📁 Creates standalone directory with all template files
- ⚙️ Sets up proper configuration files

### 3. Repository Configuration
- 📝 Updates `package.json` with GitHub repository information
- 📄 Creates `CONTRIBUTING.md` with contribution guidelines
- 📜 Creates `LICENSE` file (MIT License)
- 🔧 Sets up GitHub Actions workflows

### 4. GitHub Repository Creation
- 🚀 Creates new repository on GitHub
- 🏷️ Adds relevant topics and tags
- 📋 Sets repository description and README

### 5. Git Setup and Push
- 🔧 Initializes git repository
- 📤 Creates initial commit
- 🚀 Pushes code to GitHub repository

## 📁 Generated Repository Structure

```
your-repository-name/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml          # CI/CD pipeline
│       └── template-release.yml # NPM release workflow
├── src/                       # Template source code
├── public/                    # Static assets
├── scripts/                   # Setup scripts
├── templates/                 # Template configuration
├── package.json              # NPM package configuration
├── README.md                 # Repository documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
├── DEPLOYMENT.md             # Deployment guide
└── ...                       # Other template files
```

## 🔄 GitHub Actions Workflows

The script automatically creates two GitHub Actions workflows:

### 1. CI/CD Pipeline (`ci-cd.yml`)
- **Triggers**: Push to `main`/`develop`, Pull Requests
- **Jobs**:
  - **Test**: Linting, type checking, building
  - **Deploy**: Automatic deployment to Vercel (on main branch)

### 2. Template Release (`template-release.yml`)
- **Triggers**: Git tags (v*)
- **Jobs**:
  - **Release**: Build and publish to NPM

## 🔐 Required GitHub Secrets

After creating the repository, configure these secrets in GitHub:

### For Vercel Deployment
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### For NPM Publishing
- `NPM_TOKEN`: Your NPM authentication token

## 🏷️ Repository Topics

The script automatically adds relevant topics to your repository:

### Blog Writer Template
- `blog`, `cms`, `content-management`, `nextjs`, `react`, `typescript`, `tailwindcss`, `template`, `starter`, `admin-panel`

### AI Customer Care Template
- `ai`, `customer-care`, `voice-agents`, `chat-bot`, `analytics`, `nextjs`, `react`, `typescript`, `tailwindcss`, `template`

## 🚀 Post-Creation Steps

After running the script successfully:

1. **Visit your repository**: Check the generated GitHub repository URL
2. **Configure secrets**: Add required GitHub secrets for CI/CD
3. **Test deployment**: Create a test commit to verify CI/CD works
4. **Create first release**: Tag and push a version to trigger NPM publishing

### Creating Your First Release

```bash
# Navigate to the standalone directory
cd blog-writer-standalone  # or ai-customer-care-standalone

# Create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the template release workflow and publish to NPM.

## 🛠 Customization

### Custom Repository Organization

To use a different GitHub organization, modify the `TEMPLATES` configuration in `scripts/create-github-repo.js`:

```javascript
const TEMPLATES = {
  'blog-writer': {
    // ... other config
    githubOrg: 'your-org',  // Change this
    defaultRepoName: 'your-blog-template',
    // ... rest of config
  }
};
```

### Custom Topics and Description

Update the template configuration to customize:
- Repository description
- Topics and tags
- Default repository name

## 🐛 Troubleshooting

### Common Issues

1. **GitHub CLI not authenticated**
   ```bash
   gh auth login
   ```

2. **Repository already exists**
   - Choose a different repository name
   - Or delete the existing repository first

3. **Template extraction fails**
   - Ensure you're in the correct directory
   - Check that the extraction script exists

4. **Git push fails**
   - Verify GitHub CLI authentication
   - Check repository permissions

### Getting Help

```bash
# Show usage information
node scripts/create-github-repo.js --help

# Show available templates
npm run template:list
```

## 📚 Related Documentation

- [Template Extraction Guide](./TEMPLATE_EXTRACTION_GUIDE.md)
- [AI Customer Care Extraction Guide](./AI_CUSTOMER_CARE_EXTRACTION_GUIDE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Template Overview](./TEMPLATE_OVERVIEW.md)

## 🎯 Best Practices

1. **Use descriptive repository names** that clearly indicate the template purpose
2. **Keep repositories public** unless you have specific privacy requirements
3. **Configure all required secrets** before first deployment
4. **Test the CI/CD pipeline** with a small change
5. **Create semantic version tags** for releases (v1.0.0, v1.1.0, etc.)
6. **Update README.md** with specific instructions for your template
7. **Add custom topics** if needed for better discoverability

---

**Happy templating! 🚀**
