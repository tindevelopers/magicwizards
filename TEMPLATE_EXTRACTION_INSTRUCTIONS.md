# 🚀 Template Extraction Instructions

## Quick Start (Automated)

**Run this single command to extract any available template:**

```bash
node scripts/extract-template.js <template-name> [output-directory]
```

### Available Templates:
- **ai-customer-care** - Enterprise-grade admin platform for managing AI voice agents, chat conversations, and call analytics
- **blog-writer** - Comprehensive blog management and content creation platform with team collaboration and analytics

### Examples:
```bash
# Extract AI Customer Care template
node scripts/extract-template.js ai-customer-care

# Extract Blog Writer template  
node scripts/extract-template.js blog-writer

# Extract to custom directory
node scripts/extract-template.js blog-writer ./my-blog-app
```

## What You Get

Each extraction creates a standalone Next.js project with:
- ✅ All template-specific pages and components
- ✅ Clean dependencies (only what's needed)
- ✅ Modified navigation (template-specific only)
- ✅ Ready-to-deploy configuration
- ✅ Complete documentation
- ✅ Build caching optimization

## AI Customer Care Template

### 📁 Standalone Project Structure
```
ai-customer-care-standalone/
├── src/app/templates/ai-customer-care/     # All AI Customer Care pages
├── src/components/ai-customer-care/        # All AI Customer Care components
├── src/layout/                            # Modified layout components
├── package.json                           # Clean dependencies
├── README.md                              # Complete documentation
└── DEPLOYMENT.md                          # Deployment guide
```

### 🎯 Features Included
- **🤖 AI Agent Management** - Voice & Chat agents
- **📊 Real-time Monitoring** - Live call supervision
- **📈 Analytics Dashboard** - Performance metrics
- **📞 Call Management** - History, flows, recordings
- **🔗 Integration Hub** - CRM, telephony connections
- **📚 Knowledge Base** - Content management
- **🏢 Multi-tenant Support** - Tenant management
- **⚙️ System Settings** - Configuration management
- **🔌 API Playground** - Testing interface
- **🔐 Quality Assurance** - Compliance monitoring

## Blog Writer Template

### 📁 Standalone Project Structure
```
blog-writer-standalone/
├── src/app/templates/blog-writer/         # All Blog Writer pages
├── src/components/blog-writer/            # All Blog Writer components
├── src/layout/                            # Modified layout components
├── package.json                           # Clean dependencies
├── README.md                              # Complete documentation
└── DEPLOYMENT.md                          # Deployment guide
```

### 🎯 Features Included
- **📝 Content Management** - Draft creation and editing
- **📅 Content Calendar** - Editorial planning and scheduling
- **📊 Post Analytics** - Performance tracking and insights
- **🔍 SEO Tools** - Search engine optimization
- **📤 Publishing Management** - Content distribution
- **📚 Media Library** - Asset management
- **👥 Team Collaboration** - User management and permissions
- **🔄 Workflow Management** - Approval processes
- **📋 Content Templates** - Reusable content formats
- **🔗 Integrations** - WordPress, Webflow, Shopify, and more

## Build Caching & Performance

Both templates include optimized Next.js configuration with:
- **Static Generation** - Pre-rendered pages for better performance
- **Image Optimization** - Automatic image optimization
- **Compression** - Gzip compression enabled
- **SWC Minification** - Faster build times
- **Caching Headers** - Optimized caching strategies

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
cd <template-name>-standalone
npx vercel --prod
```

### Option 2: Netlify
```bash
cd <template-name>-standalone
npm run build
npm run export
# Upload 'out' directory to Netlify
```

### Option 3: Docker
```bash
cd <template-name>-standalone
docker build -t <template-name>-app .
docker run -p 3000:3000 <template-name>-app
```

## Next Steps After Extraction

1. **Navigate to extracted project**:
   ```bash
   cd <template-name>-standalone
   ```

2. **Install dependencies** (if not auto-installed):
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**: `http://localhost:3000`

5. **Customize**:
   - Modify components in `src/components/<template-name>/`
   - Add pages in `src/app/templates/<template-name>/`
   - Update styling with Tailwind CSS
   - Connect to your backend API

## Files Created

- ✅ `scripts/extract-ai-customer-care.js` - AI Customer Care extraction script
- ✅ `scripts/extract-blog-writer.js` - Blog Writer extraction script
- ✅ `scripts/extract-template.js` - Main wrapper script for easy usage
- ✅ `docs/AI_CUSTOMER_CARE_EXTRACTION_GUIDE.md` - Detailed AI Customer Care guide
- ✅ `TEMPLATE_EXTRACTION_INSTRUCTIONS.md` - This comprehensive guide

## Support

- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Ready to extract? Run the command above and start building your platform! 🚀**
