const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.includes('node_modules') || filePath.includes('.next')) return;

  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  // Encontra tags de abertura que contêm type="submit"
  const regex = /<([a-zA-Z0-9]+)\s+([^>]*type="submit"[^>]*)>/g;

  content = content.replace(regex, (match, tag, attributes) => {
    if (attributes.includes('disabled={')) {
      return match; // Já tem disabled
    }
    
    // Procura se tem isPending no arquivo
    if (original.includes('isPending')) {
      return `<${tag} ${attributes} disabled={isPending}>`;
    } else if (original.includes('isPendingForm')) {
      return `<${tag} ${attributes} disabled={isPendingForm}>`;
    } else if (original.includes('pending')) {
      return `<${tag} ${attributes} disabled={pending}>`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[DOUBLE-SUBMIT FIX] Updated: ${filePath}`);
  }
}

walkDir(path.join(__dirname, '../src'), processFile);
