#!/usr/bin/env node

/**
 * Script to replace icon usage in JSX
 * Replaces <TrashBinIcon> with <TrashIcon> and <MoreDotIcon> with <EllipsisVerticalIcon>
 */

const fs = require('fs');
const path = require('path');

const REPLACEMENTS = {
  'TrashBinIcon': 'TrashIcon',
  'MoreDotIcon': 'EllipsisVerticalIcon',
};

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixJSXUsage(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];
  
  Object.entries(REPLACEMENTS).forEach(([oldName, newName]) => {
    // Replace <OldIcon /> or <OldIcon className="..." />
    const regex = new RegExp(`<${oldName}(\\s[^>]*)?(\\/?>)`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `<${newName}$1$2`);
      modified = true;
      changes.push(`Replaced <${oldName}> with <${newName}>`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { modified, changes };
}

function main() {
  const adminAppDir = path.join(__dirname, '..', 'apps', 'admin');
  
  console.log('🔍 Finding files with icon usage in JSX...\n');
  
  const files = findFiles(adminAppDir).filter(file => 
    file.includes('app/') || file.includes('components/')
  );
  
  console.log(`Found ${files.length} files to check\n`);
  
  let totalModified = 0;
  
  files.forEach(file => {
    try {
      const result = fixJSXUsage(file);
      if (result.modified) {
        totalModified++;
        const relativePath = path.relative(process.cwd(), file);
        console.log(`✅ ${relativePath}`);
        result.changes.forEach(change => console.log(`   - ${change}`));
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  console.log(`\n✨ Fixed ${totalModified} files\n`);
}

if (require.main === module) {
  main();
}

module.exports = { fixJSXUsage };

