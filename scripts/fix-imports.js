const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f)
    let isDirectory = fs.statSync(dirPath).isDirectory()
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f))
  })
}

function fixImports(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return
  if (filePath.includes('node_modules') || filePath.includes('.next')) return

  let content = fs.readFileSync(filePath, 'utf8')
  if (content.includes('getTenantId') && !content.includes("import { getTenantId }")) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + "import { getTenantId } from '@/lib/tenant'\n" + content.slice(endOfLastImport + 1);
    } else {
      content = "import { getTenantId } from '@/lib/tenant'\n" + content;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed missing import in', filePath);
  }
}

walkDir(path.join(__dirname, '../src'), fixImports);
