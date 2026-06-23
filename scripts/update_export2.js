const fs = require('fs');
const path = require('path');

try {
  let exportCompleto = fs.readFileSync(path.resolve(__dirname, '../docs/EXPORT_COMPLETO.md'), 'utf8');

  const filesToUpdate = [
    'src/app/gestor/categorias/[id]/edit-form.tsx',
    'src/app/gestor/metodos/[id]/edit-form.tsx',
    'src/app/gestor/parametros/[id]/edit-form.tsx',
    'src/app/gestor/parametros/novo/page.tsx',
    'src/app/gestor/pontos-de-coleta/[id]/edit-form.tsx',
    'src/app/gestor/turnos/[id]/edit-form.tsx',
    'src/app/gestor/usuarios/[id]/edit-form.tsx',
    'src/app/gestor/usuarios/novo/page.tsx'
  ];

  let modified = false;

  for (const file of filesToUpdate) {
    const fileContent = fs.readFileSync(path.resolve(__dirname, `../${file}`), 'utf8');
    
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
    fs.writeFileSync(path.resolve(__dirname, '../docs/EXPORT_COMPLETO.md'), exportCompleto);
    console.log('Successfully updated file contents in EXPORT_COMPLETO.md!');
  }
} catch (e) {
  console.error(e);
}
