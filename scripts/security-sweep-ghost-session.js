const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixGhostSessions(filePath) {
  if (!filePath.endsWith('actions.ts')) return;
  if (filePath.includes('node_modules') || filePath.includes('.next')) return;

  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  // Substitui throw new Error('Acesso não autorizado') por redirect('/login')
  // Substitui throw new Error("Acesso não autorizado") por redirect('/login')
  const regex = /throw new Error\(['"]Acesso n[ãa]o autorizado['"]\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, "redirect('/login')");
    
    // Assegura que redirect esteja importado
    if (!content.includes('import { redirect }')) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLastImport + 1) + "import { redirect } from 'next/navigation'\n" + content.slice(endOfLastImport + 1);
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[GHOST-SESSION FIX] Updated: ${filePath}`);
  }
}

walkDir(path.join(__dirname, '../src'), fixGhostSessions);
