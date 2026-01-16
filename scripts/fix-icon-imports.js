#!/usr/bin/env node

/**
 * Script to replace @/icons SVG imports with Heroicons equivalents
 * 
 * Replaces:
 * - TrashBinIcon -> TrashIcon from @heroicons/react/24/outline
 * - MoreDotIcon -> EllipsisVerticalIcon from @heroicons/react/24/outline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ICON_REPLACEMENTS = {
  'TrashBinIcon': 'TrashIcon',
  'MoreDotIcon': 'EllipsisVerticalIcon',
};

const ICONS_PACKAGE = '@/icons';
const HEROICONS_PACKAGE = '@heroicons/react/24/outline';

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixIconImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];
  
  // Check if file imports from @/icons
  if (!content.includes(ICONS_PACKAGE)) {
    return { modified: false, changes: [] };
  }
  
  // Find all icon imports from @/icons
  const iconImportRegex = /import\s+{([^}]+)}\s+from\s+["']@\/icons["'];?/g;
  const matches = [...content.matchAll(iconImportRegex)];
  
  if (matches.length === 0) {
    return { modified: false, changes: [] };
  }
  
  // Collect all icons that need replacement
  const iconsToReplace = new Set();
  const otherIcons = new Set();
  
  matches.forEach(match => {
    const importList = match[1];
    // Parse individual imports (handle aliases like "TrashBinIcon as TrashIcon")
    const iconRegex = /(\w+)(?:\s+as\s+(\w+))?/g;
    let iconMatch;
    
    while ((iconMatch = iconRegex.exec(importList)) !== null) {
      const originalName = iconMatch[1];
      const alias = iconMatch[2];
      const displayName = alias || originalName;
      
      if (ICON_REPLACEMENTS[originalName]) {
        iconsToReplace.add({ original: originalName, replacement: ICON_REPLACEMENTS[originalName], alias: displayName });
      } else {
        otherIcons.add(originalName);
      }
    }
  });
  
  if (iconsToReplace.size === 0) {
    return { modified: false, changes: [] };
  }
  
  // Replace icon imports
  matches.forEach(match => {
    const importList = match[1];
    let newImportList = importList;
    
    // Replace each icon that needs replacement
    iconsToReplace.forEach(({ original, replacement, alias }) => {
      // Replace "TrashBinIcon" or "TrashBinIcon as TrashIcon"
      const regex = new RegExp(`${original}(?:\\s+as\\s+${alias})?`, 'g');
      if (regex.test(newImportList)) {
        newImportList = newImportList.replace(
          new RegExp(`${original}(?:\\s+as\\s+${alias})?`, 'g'),
          replacement + (alias !== original ? ` as ${alias}` : '')
        );
        changes.push(`Replaced ${original}${alias !== original ? ` as ${alias}` : ''} with ${replacement}`);
      }
    });
    
    // Remove the @/icons import if all icons were replaced
    const remainingIcons = newImportList.split(',').map(i => i.trim()).filter(i => {
      const iconName = i.split(' as ')[0].trim();
      return !ICON_REPLACEMENTS[iconName];
    });
    
    if (remainingIcons.length === 0) {
      // Remove the entire import line
      content = content.replace(match[0], '');
      changes.push('Removed @/icons import (all icons replaced)');
    } else {
      // Update the import with remaining icons
      content = content.replace(match[0], `import {${remainingIcons.join(', ')}} from "${ICONS_PACKAGE}";`);
      changes.push('Updated @/icons import (some icons remain)');
    }
  });
  
  // Add Heroicons import if not already present
  const heroiconsImportRegex = /import\s+{([^}]*)}\s+from\s+["']@heroicons\/react\/24\/outline["'];?/;
  const heroiconsMatch = content.match(heroiconsImportRegex);
  
  const iconsToImport = Array.from(iconsToReplace).map(({ replacement, alias }) => 
    alias !== replacement ? `${replacement} as ${alias}` : replacement
  );
  
  if (heroiconsMatch) {
    // Add to existing import
    const existingImports = heroiconsMatch[1].split(',').map(i => i.trim()).filter(Boolean);
    const newImports = [...new Set([...existingImports, ...iconsToImport])];
    content = content.replace(
      heroiconsMatch[0],
      `import { ${newImports.join(', ')} } from "${HEROICONS_PACKAGE}";`
    );
    changes.push('Updated existing Heroicons import');
  } else {
    // Add new import after other imports
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, `import { ${iconsToImport.join(', ')} } from "${HEROICONS_PACKAGE}";`);
      content = importLines.join('\n');
      changes.push('Added Heroicons import');
    }
  }
  
  // Replace icon usage in JSX
  iconsToReplace.forEach(({ original, replacement, alias }) => {
    // Replace <TrashBinIcon /> or <TrashBinIcon className="..." />
    const usageRegex = new RegExp(`<${original}(\\s[^>]*)?(\\/?>)`, 'g');
    if (usageRegex.test(content)) {
      content = content.replace(usageRegex, `<${alias}$1$2`);
      changes.push(`Replaced <${original}> usage with <${alias}>`);
    }
  });
  
  // Clean up duplicate imports - remove @/icons import if it only has TrashIcon that's already imported from Heroicons
  const duplicateIconRegex = /import\s+{([^}]+)}\s+from\s+["']@\/icons["'];?/g;
  const duplicateMatches = [...content.matchAll(duplicateIconRegex)];
  
  duplicateMatches.forEach(match => {
    const importList = match[1].trim();
    // If the import only contains icons we've replaced, remove it
    const iconRegex = /(\w+)(?:\s+as\s+(\w+))?/g;
    let iconMatch;
    let allReplaced = true;
    
    while ((iconMatch = iconRegex.exec(importList)) !== null) {
      const iconName = iconMatch[1];
      if (!ICON_REPLACEMENTS[iconName]) {
        allReplaced = false;
        break;
      }
    }
    
    if (allReplaced && importList) {
      content = content.replace(match[0], '');
      changes.push('Removed duplicate @/icons import (all icons replaced)');
    }
  });
  
  modified = changes.length > 0;
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { modified, changes };
}

function main() {
  const adminAppDir = path.join(__dirname, '..', 'apps', 'admin');
  const componentsDir = path.join(__dirname, '..', 'apps', 'admin', 'components');
  
  console.log('🔍 Finding files with @/icons imports...\n');
  
  const files = [
    ...findFiles(adminAppDir),
    ...findFiles(componentsDir),
  ].filter(file => 
    file.includes('app/') || file.includes('components/')
  );
  
  console.log(`Found ${files.length} files to check\n`);
  
  let totalModified = 0;
  const results = [];
  
  files.forEach(file => {
    try {
      const result = fixIconImports(file);
      if (result.modified) {
        totalModified++;
        const relativePath = path.relative(process.cwd(), file);
        results.push({ file: relativePath, changes: result.changes });
        console.log(`✅ ${relativePath}`);
        result.changes.forEach(change => console.log(`   - ${change}`));
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  console.log(`\n✨ Fixed ${totalModified} files\n`);
  
  if (totalModified > 0) {
    console.log('Summary:');
    results.forEach(({ file, changes }) => {
      console.log(`\n${file}:`);
      changes.forEach(change => console.log(`  - ${change}`));
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixIconImports };

