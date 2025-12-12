#!/usr/bin/env node

/**
 * Validation script to check for server-only imports in client components
 * 
 * This script scans the codebase for:
 * 1. Client components importing from server-only modules
 * 2. Server-only modules being imported incorrectly
 * 
 * Usage: node scripts/validate-server-imports.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SERVER_ONLY_PATTERNS = [
  /@\/core\/database\/server/,
  /@\/core\/multi-tenancy\/server/,
  /@\/core\/billing\/checkout/,
  /@\/core\/billing\/subscriptions/,
  /@\/core\/billing\/usage/,
  /@\/core\/database\/users/,
  /@\/core\/database\/organization-admins/,
  /@\/core\/database\/user-tenant-roles/,
  /@\/core\/database\/workspaces/,
  /@\/core\/multi-tenancy\/white-label/,
  /server-only/,
];

const CLIENT_COMPONENT_MARKERS = [
  /"use client"/,
  /'use client'/,
];

const SERVER_COMPONENT_MARKERS = [
  /"use server"/,
  /'use server'/,
];

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /scripts/,
  /\.test\./,
  /\.spec\./,
];

function isClientComponent(filePath, content) {
  // Check for "use client" directive
  const hasClientMarker = CLIENT_COMPONENT_MARKERS.some((pattern) =>
    pattern.test(content)
  );
  
  // Check for "use server" directive (server components)
  const hasServerMarker = SERVER_COMPONENT_MARKERS.some((pattern) =>
    pattern.test(content)
  );
  
  // If it has "use server", it's definitely not a client component
  if (hasServerMarker) {
    return false;
  }
  
  // If it's in app directory and has "use client", it's a client component
  if (filePath.includes("/app/") && hasClientMarker) {
    return true;
  }
  
  // Components directory files with "use client" are client components
  if (filePath.includes("/components/") && hasClientMarker) {
    return true;
  }
  
  return false;
}

function findServerOnlyImports(content) {
  const imports = [];
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    SERVER_ONLY_PATTERNS.forEach((pattern) => {
      if (pattern.test(line) && (line.includes("import") || line.includes("require"))) {
        imports.push({
          line: index + 1,
          content: line.trim(),
          pattern: pattern.toString(),
        });
      }
    });
  });
  
  return imports;
}

function scanDirectory(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip ignored patterns
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(fullPath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const relativePath = path.relative(process.cwd(), fullPath);
        
        if (isClientComponent(relativePath, content)) {
          const serverImports = findServerOnlyImports(content);
          if (serverImports.length > 0) {
            results.push({
              file: relativePath,
              imports: serverImports,
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error.message);
      }
    }
  }
  
  return results;
}

function main() {
  console.log("🔍 Validating server-only imports in client components...\n");
  
  const srcDir = path.join(process.cwd(), "src");
  if (!fs.existsSync(srcDir)) {
    console.error("❌ src directory not found");
    process.exit(1);
  }
  
  const violations = scanDirectory(srcDir);
  
  if (violations.length === 0) {
    console.log("✅ No violations found! All server-only imports are correctly used.\n");
    process.exit(0);
  }
  
  console.log(`❌ Found ${violations.length} file(s) with server-only import violations:\n`);
  
  violations.forEach((violation) => {
    console.log(`📄 ${violation.file}`);
    violation.imports.forEach((imp) => {
      console.log(`   Line ${imp.line}: ${imp.content}`);
    });
    console.log();
  });
  
  console.log("\n💡 Fix: Move server-only imports to server components or server actions.");
  console.log("   See: src/core/README.md for server-only module documentation.\n");
  
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, isClientComponent, findServerOnlyImports };
