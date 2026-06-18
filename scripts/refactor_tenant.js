const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('node_modules') || filePath.includes('.next')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace `const TENANT_ID      = 'default'` variations
  if (/const TENANT_ID\s*=\s*'default'/.test(content)) {
    content = content.replace(/const TENANT_ID\s*=\s*'default'\n?/g, '');
    content = content.replace(/\bTENANT_ID\b/g, '(await getTenantId())');
  }

  // Replace `tenant_id: 'default'` directly in where clauses
  if (/tenant_id:\s*'default'/.test(content)) {
    content = content.replace(/tenant_id:\s*'default'/g, 'tenant_id: (await getTenantId())');
  }

  // Add import if modified
  if (content !== originalContent && !content.includes("getTenantId")) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + "import { getTenantId } from '@/lib/tenant'\n" + content.slice(endOfLastImport + 1);
    } else {
      content = "import { getTenantId } from '@/lib/tenant'\n" + content;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated stragglers:', filePath);
  }
}

walkDir(path.join(__dirname, '../src'), processFile);
