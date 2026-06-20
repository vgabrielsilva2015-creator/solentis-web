const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'docs', 'EXPORT_COMPLETO.md');
let output = '# SOLENTIS WEB - EXPORT COMPLETO\n\nEste arquivo contém todo o código fonte relevante do projeto Solentis, exportado em ' + new Date().toISOString() + '.\n\n';

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'docs', 'artifacts', 'scripts', 'public'].includes(file)) {
        walk(fullPath);
      }
    } else {
      if (['.ts', '.tsx', '.json', '.prisma', '.css'].includes(path.extname(file)) && !file.endsWith('package-lock.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Usar o caminho relativo para melhor leitura
        const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
        output += '### `' + relativePath.replace(/\\\\/g, '/') + '`\n```ts\n' + content + '\n```\n\n';
      }
    }
  }
}

walk(path.join(__dirname, '..', 'src'));
walk(path.join(__dirname, '..', 'prisma'));

const docsDir = path.dirname(EXPORT_FILE);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(EXPORT_FILE, output);
console.log('✅ Exportado com sucesso para ' + EXPORT_FILE);
