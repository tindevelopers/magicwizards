#!/usr/bin/env node

/**
 * Blog Writer Template Extraction Script
 * 
 * This script extracts the Blog Writer template from the TinAdmin repository
 * and creates a standalone Next.js project with all necessary files and dependencies.
 * 
 * Usage: node scripts/extract-blog-writer.js [output-directory]
 * Example: node scripts/extract-blog-writer.js ./blog-writer-standalone
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEMPLATE_NAME = 'blog-writer';
const TEMPLATE_DISPLAY_NAME = 'Blog Writer';
const OUTPUT_DIR = process.argv[2] || `./${TEMPLATE_NAME}-standalone`;

// Files and directories to copy
const FILES_TO_COPY = [
  // Core Next.js files
  'next.config.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'eslint.config.mjs',
  
  // Package files
  'package.json',
  'package-lock.json',
  
  // Public assets
  'public/favicon.ico',
  'public/images',
  
  // Source structure
  'src/app/layout.tsx',
  'src/app/globals.css',
  'src/app/not-found.tsx',
  'src/app/loading.tsx',
  'src/context',
  'src/hooks',
  'src/utils',
  'src/svg.d.ts',
  
  // Template-specific files
  `src/app/templates/${TEMPLATE_NAME}`,
  `src/components/${TEMPLATE_NAME}`,
  'src/layout/AppSidebar.tsx',
  'src/layout/AppHeader.tsx',
  'src/layout/Backdrop.tsx',
  'src/layout/SidebarWidget.tsx',
  
  // Icons (we'll filter these)
  'src/icons',
  
  // Documentation
  'docs/MULTITENANT_ARCHITECTURE.md',
  `templates/${TEMPLATE_NAME}/template.config.json`,
];

// Files to create/modify
const FILES_TO_CREATE = [
  'src/app/page.tsx',
  'src/app/(admin)/layout.tsx',
  'src/app/(admin)/page.tsx',
  'README.md',
  'DEPLOYMENT.md',
];

// Dependencies to include (filtered from main package.json)
const REQUIRED_DEPENDENCIES = [
  'next@^15.5.4',
  'react@^19.0.0',
  'react-dom@^19.0.0',
  '@types/node@^22.0.0',
  '@types/react@^19.0.0',
  '@types/react-dom@^19.0.0',
  '@types/prismjs@^1.26.5',
  'typescript@^5.0.0',
  'tailwindcss@^4.0.0',
  'autoprefixer@^10.4.0',
  'postcss@^8.4.0',
  'eslint@^9.0.0',
  'eslint-config-next@^15.5.4',
  '@heroicons/react@^2.1.0',
  '@svgr/webpack@^8.1.0',
  '@tailwindcss/forms@^0.5.9',
  '@tailwindcss/postcss@^4.0.9',
  'clsx@^2.1.0',
  'tailwind-merge@^2.5.0',
  'lucide-react@^0.460.0',
  'recharts@^2.13.0',
  'apexcharts@^4.3.0',
];

const REQUIRED_DEV_DEPENDENCIES = [
  '@types/node@^22.0.0',
  '@types/react@^19.0.0',
  '@types/react-dom@^19.0.0',
  'typescript@^5.0.0',
  'eslint@^9.0.0',
  'eslint-config-next@^15.5.4',
];

// Scripts to include
const REQUIRED_SCRIPTS = {
  'dev': 'next dev',
  'build': 'next build',
  'start': 'next start',
  'lint': 'next lint',
  'type-check': 'tsc --noEmit'
};

// Utility functions
function log(message, type = 'info') {
  const icons = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄'
  };
  console.log(`${icons[type]} ${message}`);
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileOrDirectory(src, dest) {
  const srcPath = path.resolve(src);
  const destPath = path.resolve(dest);
  
  if (!fs.existsSync(srcPath)) {
    log(`Warning: Source path does not exist: ${srcPath}`, 'warning');
    return;
  }
  
  ensureDirectoryExists(path.dirname(destPath));
  
  if (fs.statSync(srcPath).isDirectory()) {
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true });
    }
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

function createPackageJson() {
  const packageJson = {
    name: `${TEMPLATE_NAME}-standalone`,
    version: '1.0.0',
    description: `${TEMPLATE_DISPLAY_NAME} Template - A comprehensive blog management and content creation platform`,
    private: true,
    scripts: REQUIRED_SCRIPTS,
    dependencies: {},
    devDependencies: {},
    engines: {
      node: '>=18.0.0',
      npm: '>=8.0.0'
    }
  };
  
  // Add dependencies
  REQUIRED_DEPENDENCIES.forEach(dep => {
    const [name, version] = dep.split('@');
    packageJson.dependencies[name] = version;
  });
  
  REQUIRED_DEV_DEPENDENCIES.forEach(dep => {
    const [name, version] = dep.split('@');
    packageJson.devDependencies[name] = version;
  });
  
  return packageJson;
}

function createMainPage() {
  return `import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the blog writer template
  redirect('/templates/${TEMPLATE_NAME}');
}`;
}

function createAdminLayout() {
  return `import { ReactNode } from 'react';
import AppHeader from '@/layout/AppHeader';
import AppSidebar from '@/layout/AppSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}`;
}

function createAdminPage() {
  return `import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to the blog writer template
  redirect('/templates/${TEMPLATE_NAME}');
}`;
}

function createReadme() {
  return `# ${TEMPLATE_DISPLAY_NAME} Template

A comprehensive blog management and content creation platform built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

### 📝 Content Management
- **Draft Management** - Create, edit, and organize blog post drafts
- **Content Calendar** - Plan and schedule your content strategy
- **Media Library** - Upload and manage images, videos, and documents
- **Content Templates** - Reusable templates for consistent formatting

### 📊 Analytics & SEO
- **Post Analytics** - Track performance metrics and engagement
- **SEO Tools** - Optimize content for search engines
- **Performance Insights** - Monitor traffic and user behavior

### 👥 Team Collaboration
- **Team Management** - Manage authors, editors, and contributors
- **Workflow Management** - Define approval processes and content workflows
- **Role-based Permissions** - Control access to different features

### 🔗 Integrations
- **CMS Integration** - WordPress, Webflow, and other content management systems
- **Social Media** - Twitter, LinkedIn, and other social platforms
- **E-commerce** - Shopify and other e-commerce platforms
- **Email Marketing** - Mailchimp and other email services
- **Analytics** - Google Analytics and other tracking tools

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Charts**: Recharts
- **State Management**: React Hooks

## 📦 Installation

1. **Clone or download** this template
2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser** and navigate to \`http://localhost:3000\`

## 🏗️ Project Structure

\`\`\`
src/
├── app/
│   ├── templates/blog-writer/     # Blog writer pages
│   │   ├── analytics/             # Analytics dashboard
│   │   ├── calendar/              # Content calendar
│   │   ├── drafts/                # Draft management
│   │   ├── integrations/          # Third-party integrations
│   │   ├── media/                 # Media library
│   │   ├── publishing/            # Publishing management
│   │   ├── seo/                   # SEO tools
│   │   ├── team/                  # Team collaboration
│   │   ├── templates/             # Content templates
│   │   └── workflows/             # Workflow management
│   └── layout.tsx                 # Root layout
├── components/
│   └── blog-writer/               # Blog writer components
├── layout/                        # Layout components
└── hooks/                         # Custom React hooks
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)
\`\`\`bash
npm run build
npx vercel --prod
\`\`\`

### Netlify
\`\`\`bash
npm run build
npm run export
# Upload the 'out' directory to Netlify
\`\`\`

### Docker
\`\`\`bash
# Build the image
docker build -t blog-writer-app .

# Run the container
docker run -p 3000:3000 blog-writer-app
\`\`\`

## 🔧 Customization

### Adding New Pages
1. Create a new directory in \`src/app/templates/blog-writer/\`
2. Add a \`page.tsx\` file with your component
3. Update the sidebar navigation in \`src/layout/AppSidebar.tsx\`

### Styling
- Modify \`src/app/globals.css\` for global styles
- Use Tailwind CSS classes for component styling
- Customize the theme in \`tailwind.config.ts\`

### Adding Integrations
1. Create integration components in \`src/components/blog-writer/\`
2. Add API endpoints and configuration
3. Update the integrations page

## 📚 API Integration

The template includes comprehensive API integration support:

- **Content Management APIs** - CRUD operations for posts, drafts, media
- **Analytics APIs** - Performance tracking and reporting
- **User Management APIs** - Team collaboration and permissions
- **Workflow APIs** - Content approval and publishing processes
- **Integration APIs** - Third-party service connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This template is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Ready to build your blog platform? Start with this template! 🚀**`;
}

function createDeploymentGuide() {
  return `# Deployment Guide - ${TEMPLATE_DISPLAY_NAME} Template

This guide covers various deployment options for your ${TEMPLATE_DISPLAY_NAME} application.

## 🚀 Quick Deploy (Vercel - Recommended)

### 1. Deploy to Vercel
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
\`\`\`

### 2. Environment Variables
Set these in your Vercel dashboard:
\`\`\`env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-domain.com
\`\`\`

## 🐳 Docker Deployment

### 1. Create Dockerfile
\`\`\`dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

### 2. Build and Run
\`\`\`bash
# Build the image
docker build -t blog-writer-app .

# Run the container
docker run -p 3000:3000 blog-writer-app
\`\`\`

## ☁️ AWS Deployment

### 1. Using AWS Amplify
\`\`\`bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
\`\`\`

### 2. Using AWS Lambda (Serverless)
\`\`\`bash
# Install serverless framework
npm install -g serverless

# Deploy
serverless deploy
\`\`\`

## 🌐 Netlify Deployment

### 1. Build Settings
\`\`\`yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"

[[plugins]]
  package = "@netlify/plugin-nextjs"
\`\`\`

### 2. Deploy
\`\`\`bash
# Build for static export
npm run build
npm run export

# Deploy to Netlify
npx netlify deploy --prod --dir=out
\`\`\`

## 🔧 Environment Configuration

### Development
\`\`\`env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

### Production
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com
\`\`\`

## 📊 Performance Optimization

### 1. Enable Caching
\`\`\`typescript
// next.config.ts
const nextConfig = {
  experimental: {
    // Enable static generation
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // Enable caching
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};
\`\`\`

### 2. Image Optimization
\`\`\`typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority
/>
\`\`\`

### 3. Bundle Analysis
\`\`\`bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
\`\`\`

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit \`.env.local\` files
- Use secure random secrets for production
- Rotate API keys regularly

### 2. HTTPS
- Always use HTTPS in production
- Configure proper SSL certificates
- Enable HSTS headers

### 3. Content Security Policy
\`\`\`typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};
\`\`\`

## 📈 Monitoring & Analytics

### 1. Error Tracking
\`\`\`bash
# Install Sentry
npm install @sentry/nextjs
\`\`\`

### 2. Performance Monitoring
\`\`\`bash
# Install Vercel Analytics
npm install @vercel/analytics
\`\`\`

### 3. Uptime Monitoring
- Set up UptimeRobot or similar service
- Monitor critical endpoints
- Configure alert notifications

## 🚀 CI/CD Pipeline

### GitHub Actions Example
\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
\`\`\`

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (requires 18+)
   - Clear \`node_modules\` and reinstall
   - Verify all dependencies are compatible

2. **Deployment Issues**
   - Check environment variables
   - Verify build output directory
   - Check deployment logs

3. **Performance Issues**
   - Enable caching
   - Optimize images
   - Use CDN for static assets

### Getting Help
- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Happy deploying! 🚀**`;
}

function modifyAppSidebar() {
  const sidebarPath = path.join(OUTPUT_DIR, 'src/layout/AppSidebar.tsx');
  if (fs.existsSync(sidebarPath)) {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // Replace the navigation items to only include blog writer
    const blogWriterNavItems = `
const navItems = [
  {
    name: "Blog Writer",
    icon: <MailIcon />,
    new: true,
    subItems: [
      { name: "Dashboard", path: "/templates/blog-writer" },
      { name: "Content Calendar", path: "/templates/blog-writer/calendar", pro: true },
      { name: "Post Analytics", path: "/templates/blog-writer/analytics", pro: true },
      { name: "SEO Tools", path: "/templates/blog-writer/seo", pro: true },
      { name: "Publishing", path: "/templates/blog-writer/publishing", pro: true },
      { name: "Drafts", path: "/templates/blog-writer/drafts", new: true },
      { name: "Media Library", path: "/templates/blog-writer/media", new: true },
      { name: "Team Management", path: "/templates/blog-writer/team", new: true },
      { name: "Content Templates", path: "/templates/blog-writer/templates", new: true },
      { name: "Workflows", path: "/templates/blog-writer/workflows", new: true },
      { name: "Integrations", path: "/templates/blog-writer/integrations", new: true },
    ],
  },
];`;

    // Replace the navItems array
    sidebarContent = sidebarContent.replace(
      /const navItems = \[[\s\S]*?\];/,
      blogWriterNavItems
    );
    
    fs.writeFileSync(sidebarPath, sidebarContent);
  }
}

function addBuildCaching() {
  const nextConfigPath = path.join(OUTPUT_DIR, 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    let configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Add caching configuration
    const cachingConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable static generation for better performance
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // Enable caching for better performance
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Enable image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  // Enable compression
  compress: true,
  // Enable static optimization
  trailingSlash: false,
  // Enable SWC minification
  swcMinify: true,
};`;
    
    // Replace the existing config
    configContent = configContent.replace(
      /\/\*\* @type \{import\('next'\)\.NextConfig\} \*\/[\s\S]*?const nextConfig = \{[\s\S]*?\};/,
      cachingConfig
    );
    
    // Add path import if not present
    if (!configContent.includes("import path from 'path';")) {
      configContent = configContent.replace(
        "import type { NextConfig } from 'next';",
        "import type { NextConfig } from 'next';\nimport path from 'path';"
      );
    }
    
    fs.writeFileSync(nextConfigPath, configContent);
  }
}

// Main extraction function
function extractTemplate() {
  log(`Starting ${TEMPLATE_DISPLAY_NAME} template extraction...`, 'progress');
  
  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    log(`Cleaning existing output directory: ${OUTPUT_DIR}`, 'info');
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);
  log(`Created output directory: ${OUTPUT_DIR}`, 'success');
  
  // Copy files and directories
  log('Copying template files...', 'progress');
  FILES_TO_COPY.forEach(file => {
    const srcPath = path.resolve(file);
    const destPath = path.join(OUTPUT_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      copyFileOrDirectory(srcPath, destPath);
      log(`Copied: ${file}`, 'success');
    } else {
      log(`Skipped (not found): ${file}`, 'warning');
    }
  });
  
  // Create package.json
  log('Creating package.json...', 'progress');
  const packageJson = createPackageJson();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  log('Created package.json', 'success');
  
  // Create main page
  log('Creating main page...', 'progress');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'src/app/page.tsx'),
    createMainPage()
  );
  log('Created main page', 'success');
  
  // Create admin layout
  log('Creating admin layout...', 'progress');
  ensureDirectoryExists(path.join(OUTPUT_DIR, 'src/app/(admin)'));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'src/app/(admin)/layout.tsx'),
    createAdminLayout()
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'src/app/(admin)/page.tsx'),
    createAdminPage()
  );
  log('Created admin layout and page', 'success');
  
  // Create documentation
  log('Creating documentation...', 'progress');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'README.md'),
    createReadme()
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'DEPLOYMENT.md'),
    createDeploymentGuide()
  );
  log('Created documentation', 'success');
  
  // Modify AppSidebar for blog writer only
  log('Modifying navigation...', 'progress');
  modifyAppSidebar();
  log('Modified navigation', 'success');
  
  // Add build caching configuration
  log('Adding build caching configuration...', 'progress');
  addBuildCaching();
  log('Added build caching configuration', 'success');
  
  // Install dependencies
  log('Installing dependencies...', 'progress');
  try {
    execSync('npm install', { 
      cwd: OUTPUT_DIR, 
      stdio: 'inherit' 
    });
    log('Dependencies installed successfully', 'success');
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, 'error');
    log('Please run "npm install" manually in the output directory', 'warning');
  }
  
  log(`🎉 ${TEMPLATE_DISPLAY_NAME} template extraction completed!`, 'success');
  log(`📁 Output directory: ${OUTPUT_DIR}`, 'info');
  log('🚀 Next steps:', 'info');
  log('   1. cd ' + OUTPUT_DIR, 'info');
  log('   2. npm run dev', 'info');
  log('   3. Open http://localhost:3000', 'info');
  log('', 'info');
  log('📚 Documentation available in README.md and DEPLOYMENT.md', 'info');
}

// Run extraction
if (require.main === module) {
  extractTemplate();
}

module.exports = { extractTemplate };
