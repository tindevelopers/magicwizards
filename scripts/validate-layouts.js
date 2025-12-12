#!/usr/bin/env node

/**
 * Validation script to check route layout consistency
 * 
 * This script ensures:
 * 1. Routes that should have admin layout are in (admin) group
 * 2. Routes that should be full-width are in (full-width-pages) group
 * 3. No duplicate layouts exist
 * 
 * Usage: node scripts/validate-layouts.js
 */

const fs = require("fs");
const path = require("path");

const ADMIN_ROUTES = [
  /^\/profile/,
  /^\/saas/,
  /^\/text-generator/,
  /^\/code-generator/,
  /^\/image-generator/,
  /^\/video-generator/,
  /^\/calendar/,
  /^\/task-/,
  /^\/form-/,
  /^\/basic-tables/,
  /^\/data-tables/,
  /^\/file-manager/,
  /^\/pricing-tables/,
  /^\/faq/,
  /^\/api-keys/,
  /^\/integrations/,
  /^\/blank/,
  /^\/chat/,
  /^\/support-/,
  /^\/inbox/,
  /^\/products-/,
  /^\/billing/,
  /^\/invoices/,
  /^\/transactions/,
  /^\/line-chart/,
  /^\/bar-chart/,
  /^\/pie-chart/,
  /^\/alerts/,
  /^\/avatars/,
  /^\/badge/,
  /^\/breadcrumb/,
  /^\/buttons/,
  /^\/cards/,
  /^\/carousel/,
  /^\/dropdowns/,
  /^\/images/,
  /^\/links/,
  /^\/list/,
  /^\/modals/,
  /^\/notifications/,
  /^\/pagination/,
  /^\/popovers/,
  /^\/progress-bar/,
  /^\/ribbons/,
  /^\/spinners/,
  /^\/tabs/,
  /^\/tooltips/,
  /^\/videos/,
  /^\/multi-tenant/,
];

const FULL_WIDTH_ROUTES = [
  /^\/signin/,
  /^\/signup/,
  /^\/reset-password/,
  /^\/two-step-verification/,
  /^\/error-404/,
  /^\/error-500/,
  /^\/error-503/,
  /^\/maintenance/,
  /^\/coming-soon/,
  /^\/success/,
];

function findPageFiles(dir, results = [], currentPath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(currentPath, entry.name);
    
    if (entry.isDirectory()) {
      findPageFiles(fullPath, results, relativePath);
    } else if (entry.name === "page.tsx" || entry.name === "page.js") {
      results.push({
        file: fullPath,
        route: currentPath || "/",
      });
    }
  }
  
  return results;
}

function findLayoutFile(filePath) {
  // Check current directory and all parent directories for layout files
  let currentDir = path.dirname(filePath);
  const appDir = path.join(process.cwd(), "src/app");
  
  while (currentDir.startsWith(appDir)) {
    const layoutPath = path.join(currentDir, "layout.tsx");
    const layoutPathAlt = path.join(currentDir, "layout.js");
    
    if (fs.existsSync(layoutPath)) {
      return layoutPath;
    }
    if (fs.existsSync(layoutPathAlt)) {
      return layoutPathAlt;
    }
    
    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }
  
  return null;
}

function getRouteLayoutGroup(filePath) {
  if (filePath.includes("/(admin)/")) {
    return "admin";
  }
  if (filePath.includes("/(full-width-pages)/")) {
    return "full-width";
  }
  
  // Check if route has a layout file (in current or parent dir) that uses AdminLayout
  const layoutFile = findLayoutFile(filePath);
  if (layoutFile) {
    try {
      const layoutContent = fs.readFileSync(layoutFile, "utf8");
      if (layoutContent.includes("AdminLayout") || layoutContent.includes("@/layout/AdminLayout")) {
        // Route uses AdminLayout, so it's effectively in admin layout group
        if (filePath.includes("/admin/")) {
          return "admin-standalone-ok";
        }
        if (filePath.includes("/dashboard/")) {
          return "dashboard-standalone-ok";
        }
        if (filePath.includes("/saas/")) {
          return "saas-standalone-ok";
        }
      }
    } catch (error) {
      // If we can't read the layout file, continue with normal detection
    }
  }
  
  if (filePath.includes("/admin/")) {
    return "admin-standalone";
  }
  if (filePath.includes("/dashboard/")) {
    return "dashboard-standalone";
  }
  if (filePath.includes("/saas/")) {
    return "saas-standalone";
  }
  return "root";
}

function shouldBeInAdminLayout(route) {
  return ADMIN_ROUTES.some((pattern) => pattern.test(route));
}

function shouldBeFullWidth(route) {
  return FULL_WIDTH_ROUTES.some((pattern) => pattern.test(route));
}

function main() {
  console.log("🔍 Validating route layout consistency...\n");
  
  const appDir = path.join(process.cwd(), "src/app");
  if (!fs.existsSync(appDir)) {
    console.error("❌ src/app directory not found");
    process.exit(1);
  }
  
  const pages = findPageFiles(appDir);
  const issues = [];
  
  pages.forEach((page) => {
    // Skip redirect-only pages (they don't need layouts)
    try {
      const pageContent = fs.readFileSync(page.file, "utf8");
      if (pageContent.includes("redirect(") && !pageContent.includes("export default") || 
          (pageContent.includes("redirect(") && pageContent.split("redirect(").length === 2 && 
           !pageContent.includes("return"))) {
        // This is likely a redirect-only page, skip validation
        return;
      }
    } catch (error) {
      // If we can't read the file, continue with validation
    }
    
    const layoutGroup = getRouteLayoutGroup(page.file);
    const route = page.route;
    
    // Check if route should be in admin layout
    if (shouldBeInAdminLayout(route) && layoutGroup !== "admin") {
      issues.push({
        route,
        file: page.file,
        currentLayout: layoutGroup,
        expectedLayout: "admin",
        type: "missing-admin-layout",
      });
    }
    
    // Check if route should be full-width
    if (shouldBeFullWidth(route) && layoutGroup !== "full-width") {
      issues.push({
        route,
        file: page.file,
        currentLayout: layoutGroup,
        expectedLayout: "full-width",
        type: "missing-full-width-layout",
      });
    }
    
    // Warn about standalone layouts that don't use AdminLayout
    // Skip routes that use AdminLayout (marked with -ok suffix)
    if (["admin-standalone", "dashboard-standalone", "saas-standalone"].includes(layoutGroup) && 
        !layoutGroup.endsWith("-ok")) {
      issues.push({
        route,
        file: page.file,
        currentLayout: layoutGroup,
        expectedLayout: "admin",
        type: "standalone-layout-warning",
      });
    }
  });
  
  if (issues.length === 0) {
    console.log("✅ All routes have correct layout assignments!\n");
    process.exit(0);
  }
  
  console.log(`⚠️  Found ${issues.length} layout issue(s):\n`);
  
  const errors = issues.filter((i) => i.type !== "standalone-layout-warning");
  const warnings = issues.filter((i) => i.type === "standalone-layout-warning");
  
  if (errors.length > 0) {
    console.log("❌ Errors:\n");
    errors.forEach((issue) => {
      console.log(`   Route: ${issue.route}`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Current: ${issue.currentLayout}`);
      console.log(`   Expected: ${issue.expectedLayout}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log("⚠️  Warnings (consider consolidating):\n");
    warnings.forEach((issue) => {
      console.log(`   Route: ${issue.route}`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Current: ${issue.currentLayout}`);
      console.log(`   Consider: Move to (admin) layout group\n`);
    });
  }
  
  console.log("\n💡 Fix: Move routes to appropriate layout groups:");
  console.log("   - Admin routes → src/app/(admin)/");
  console.log("   - Full-width routes → src/app/(full-width-pages)/\n");
  
  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { findPageFiles, getRouteLayoutGroup, shouldBeInAdminLayout, shouldBeFullWidth };
