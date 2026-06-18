const fs = require('fs')
const path = require('path')

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f)
    let isDirectory = fs.statSync(dirPath).isDirectory()
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f))
  })
}

function fixIDOR(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return
  if (filePath.includes('node_modules') || filePath.includes('.next')) return

  let original = fs.readFileSync(filePath, 'utf8')
  let content = original

  // 1. Convert findUnique to findFirst to allow tenant_id
  // This matches: findUnique({ where: { id },
  // Or: findUnique({ where: { id: something },
  content = content.replace(/findUnique\(\{\s*where:\s*\{\s*id\s*(:\s*[^,}]+)?\s*\},/g, (match, p1) => {
    let idExp = p1 ? `id${p1}` : 'id'
    return `findFirst({ where: { ${idExp}, tenant_id: (await getTenantId()) },`
  })

  // Also replace if there's no trailing comma but there are other properties like select
  content = content.replace(/findUnique\(\{\s*where:\s*\{\s*id\s*(:\s*[^,}]+)?\s*\}\s*,?\s*(select|include)/g, (match, p1, p2) => {
    let idExp = p1 ? `id${p1}` : 'id'
    return `findFirst({ where: { ${idExp}, tenant_id: (await getTenantId()) }, ${p2}`
  })

  // Same for update
  content = content.replace(/update\(\{\s*where:\s*\{\s*id\s*(:\s*[^,}]+)?\s*\}\s*,?\s*data:/g, (match, p1) => {
    let idExp = p1 ? `id${p1}` : 'id'
    return `updateMany({ where: { ${idExp}, tenant_id: (await getTenantId()) }, data:`
  })

  // Same for delete
  content = content.replace(/delete\(\{\s*where:\s*\{\s*id\s*(:\s*[^,}]+)?\s*\}\s*\}\)/g, (match, p1) => {
    let idExp = p1 ? `id${p1}` : 'id'
    return `deleteMany({ where: { ${idExp}, tenant_id: (await getTenantId()) } })`
  })


  if (content !== original) {
    if (!content.includes("getTenantId")) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLastImport + 1) + "import { getTenantId } from '@/lib/tenant'\n" + content.slice(endOfLastImport + 1);
      } else {
        content = "import { getTenantId } from '@/lib/tenant'\n" + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`[IDOR FIX] Updated: ${filePath}`)
  }
}

walkDir(path.join(__dirname, '../src'), fixIDOR)
