const fs = require('fs');
const path = require('path');

try {
  const handoff = fs.readFileSync('C:/Users/Vitor/Downloads/SOLENTIS-HANDOFF.md', 'utf8');
  let claude = fs.readFileSync(path.resolve(__dirname, '../CLAUDE.md'), 'utf8');
  let exportCompleto = fs.readFileSync(path.resolve(__dirname, '../docs/EXPORT_COMPLETO.md'), 'utf8');

  const newClaude = claude + '\n\n' + handoff;
  fs.writeFileSync(path.resolve(__dirname, '../CLAUDE.md'), newClaude);

  // Use regex to find the section
  const regex = /(### `CLAUDE\.md`\r?\n```markdown\r?\n)[\s\S]*?(```\r?\n\r?\n---\r?\n## CONFIGURAÇÃO DO PROJETO)/;
  
  if (regex.test(exportCompleto)) {
    const newExport = exportCompleto.replace(regex, `$1${newClaude}\n$2`);
    fs.writeFileSync(path.resolve(__dirname, '../docs/EXPORT_COMPLETO.md'), newExport);
    console.log('Successfully updated CLAUDE.md and EXPORT_COMPLETO.md via regex!');
  } else {
    console.log('Regex did not match EXPORT_COMPLETO.md content.');
  }
} catch (e) {
  console.error(e);
}
