const fs = require('fs');

try {
  let exportCompleto = fs.readFileSync('C:/Users/Vitor/projetos/meu-projeto/docs/EXPORT_COMPLETO.md', 'utf8');

  const filesToUpdate = [
    'src/app/gestor/turnos/novo/page.tsx',
    'src/app/gestor/turnos/instancias/[id]/page.tsx',
    'src/app/gestor/pontos-de-coleta/novo/page.tsx',
    'src/app/gestor/metodos/novo/page.tsx',
    'src/app/gestor/categorias/novo/page.tsx',
    'src/app/gestor/produtos-quimicos/novo/page.tsx',
    'src/app/gestor/produtos-quimicos/[id]/page.tsx',
    'src/app/gestor/produtos-quimicos/[id]/entrada/page.tsx'
  ];

  let modified = false;

  for (const file of filesToUpdate) {
    const fileContent = fs.readFileSync(`C:/Users/Vitor/projetos/meu-projeto/${file}`, 'utf8');
    
    // Create a regex to match the section for this file. 
    // It looks for: ### `filename`\n```tsx\n ... \n```\n
    // Using string replacement or regex:
    const regex = new RegExp(`(### \`${file.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\`\\r?\\n\`\`\`[a-z]*\\r?\\n)[\\s\\S]*?(\`\`\`\\r?\\n)`, 'i');
    
    if (regex.test(exportCompleto)) {
      exportCompleto = exportCompleto.replace(regex, `$1${fileContent}\n$2`);
      console.log(`Updated ${file} in EXPORT_COMPLETO.md`);
      modified = true;
    } else {
      console.log(`Could not find section for ${file}`);
    }
  }

  if (modified) {
    fs.writeFileSync('C:/Users/Vitor/projetos/meu-projeto/docs/EXPORT_COMPLETO.md', exportCompleto);
    console.log('Successfully updated file contents in EXPORT_COMPLETO.md!');
  }
} catch (e) {
  console.error(e);
}
