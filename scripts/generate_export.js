const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'docs', 'EXPORT_COMPLETO.md');

const DIRS_TO_SCAN = ['src', 'prisma', 'components'];
const FILES_TO_SCAN = ['package.json', 'README.md', 'tailwind.config.ts', 'next.config.ts', 'tsconfig.json'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

let markdownContent = `# SOLENTIS WEB - EXPORT COMPLETO\n\nEste arquivo contém todo o código fonte relevante do projeto Solentis, exportado em ${new Date().toISOString()}.\n\n`;

// Scan directories
DIRS_TO_SCAN.forEach(dirName => {
    const dirPath = path.join(ROOT_DIR, dirName);
    if (fs.existsSync(dirPath)) {
        const files = walk(dirPath);
        files.forEach(file => {
            const ext = path.extname(file);
            if (['.ts', '.tsx', '.js', '.jsx', '.css', '.prisma', '.json'].includes(ext)) {
                const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
                const content = fs.readFileSync(file, 'utf8');
                const lang = ext.slice(1);
                markdownContent += `### \`${relativePath}\`\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
            }
        });
    }
});

// Scan root files
FILES_TO_SCAN.forEach(fileName => {
    const file = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(file)) {
        const ext = path.extname(file);
        const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
        const content = fs.readFileSync(file, 'utf8');
        let lang = ext ? ext.slice(1) : '';
        if (fileName === 'package.json') lang = 'json';
        markdownContent += `### \`${relativePath}\`\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }
});

if (!fs.existsSync(path.join(ROOT_DIR, 'docs'))) {
    fs.mkdirSync(path.join(ROOT_DIR, 'docs'));
}

fs.writeFileSync(OUTPUT_FILE, markdownContent);
console.log(`Export completo gerado com sucesso em: ${OUTPUT_FILE}`);
