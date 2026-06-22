const fs = require('fs');
const path = require('path');

const appDir = path.join(process.cwd(), 'src', 'app');
const routes = new Set();
const links = new Set();

function findRoutes(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findRoutes(fullPath);
    } else if (file === 'page.tsx') {
      let route = fullPath.replace(appDir, '').replace(/\\\\/g, '/').replace('/page.tsx', '') || '/';
      routes.add(route);
    }
  }
}

function findLinks(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        findLinks(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const hrefRegex = /href=["'](\/[a-z0-9\-\/]+)["']/gi;
      let m;
      while ((m = hrefRegex.exec(content)) !== null) {
        links.add(m[1]);
      }
      
      const pushRegex = /router\.push\(["'](\/[a-z0-9\-\/]+)["']/gi;
      while ((m = pushRegex.exec(content)) !== null) {
        links.add(m[1]);
      }
    }
  }
}

findRoutes(appDir);
findLinks(path.join(process.cwd(), 'src'));

console.log('--- EXISTING ROUTES (with brackets) ---');
console.log(Array.from(routes).sort().join('\n'));
console.log('\n--- FOUND LINKS IN CODE ---');
console.log(Array.from(links).sort().join('\n'));

// check which links do not match any route
const deadLinks = [];
links.forEach(link => {
  let cleanLink = link.split('?')[0];
  let matched = false;
  for (const route of routes) {
    let regexStr = '^' + route.replace(/\[.*?\]/g, '[^/]+') + '$';
    let regex = new RegExp(regexStr);
    if (regex.test(cleanLink)) {
      matched = true;
      break;
    }
  }
  if (!matched && cleanLink !== '/' && !cleanLink.startsWith('/api')) {
    deadLinks.push(cleanLink);
  }
});

console.log('\n--- POTENTIALLY DEAD LINKS ---');
console.log(deadLinks.sort().join('\n'));
