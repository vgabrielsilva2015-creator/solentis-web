const fs = require('fs')
const path = require('path')

function replaceInDir(dir) {
  const files = fs.readdirSync(dir)
  for (const f of files) {
    const fullPath = path.join(dir, f)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      replaceInDir(fullPath)
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false
      if (content.includes('turnos/instancias')) {
        content = content.replace(/turnos\/instancias/g, 'turnos/tarefas')
        changed = true
      }
      if (content.includes('Instâncias de Turno')) {
        content = content.replace(/Instâncias de Turno/g, 'Tarefas do Turno')
        changed = true
      }
      if (content.includes('Instâncias')) {
        content = content.replace(/Instâncias/g, 'Tarefas')
        changed = true
      }
      if (content.includes('Instância')) {
        content = content.replace(/Instância/g, 'Tarefa')
        changed = true
      }
      if (changed) {
        fs.writeFileSync(fullPath, content)
        console.log('Updated', fullPath)
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'src'))
