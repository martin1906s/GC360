const fs = require('fs');
const path = require('path');

function walk(dir, ext = '.tsx') {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res = res.concat(walk(full, ext));
    else if (full.endsWith(ext)) res.push(full);
  }
  return res;
}

const srcDir = path.join(__dirname, '..', 'src');
const appDir = path.join(srcDir, 'app');
const tsxFiles = walk(srcDir);

console.log('--- 1. BUSCANDO PALABRAS TÉCNICAS O INTERNAS EN TEXTOS DE UI (.tsx) ---');
const bannedWords = [
  /\btenant\b/i,
  /\btenants\b/i,
  /simulad/i,
  /demostrativ/i,
  /RN-\d+/i,
  /GC-RF-\d+/i,
  /\bP2\b/,
  /criterio\s+\d+/i
];

const suspiciousLines = [];
for (const f of tsxFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    // Check if line contains JSX text or attributes
    for (const b of bannedWords) {
      if (b.test(trimmed)) {
        // Exclude purely code constructs like `tenantId:`, `t.tenantId`, `const tenant =`, `type Tenant`, etc.
        const isCodeConstruct =
          /\b(tenantId|tenant\.id|tenant\?\.id|tenant\.name|tenant\?\.name|tenant\.logo|t\.id|tenant_id)\b/.test(trimmed) &&
          !/>.*tenant.*</i.test(trimmed) &&
          !/["'][^"']*tenant[^"']*["']/i.test(trimmed);

        if (!isCodeConstruct) {
          suspiciousLines.push({
            file: path.relative(srcDir, f),
            line: idx + 1,
            text: trimmed,
            match: b.toString()
          });
        }
      }
    }
  });
}

console.log(`Encontradas ${suspiciousLines.length} líneas sospechosas:`);
suspiciousLines.forEach(s => console.log(`[${s.file}:${s.line}] (${s.match}) -> ${s.text}`));

console.log('\n--- 2. VALIDANDO RUTAS EXISTENTES EN APP ROUTER ---');
// Extract all routes from src/app
const pageFiles = walk(appDir, 'page.tsx');
const validRoutes = pageFiles.map(p => {
  let rel = path.relative(appDir, p).replace(/\\/g, '/').replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '');
  // remove route groups like (app)
  rel = rel.replace(/\/?\([^)]+\)\/?/g, '/').replace(/\/+/g, '/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  return rel;
});

console.log('Rutas válidas en src/app:', validRoutes);

console.log('\n--- 3. VERIFICANDO TODOS LOS ENLACES (Link href) Y REDIRECCIONES (router.push) ---');
const linkRegex = /<(?:Link|a)\s+[^>]*href=\{?["'`]([^"'`}{]+)["'`]\}?|router\.push\(["'`]([^"'`]+)["'`]\)/g;
const deadLinks = [];
const allExtractedLinks = [];

function routeMatches(pattern, route) {
  // exact match
  if (pattern === route) return true;
  // route with params e.g. /casos/[id] matches /casos/k_3 or /casos/${...}
  const cleanRoute = route.split('?')[0];
  const patternParts = pattern.split('/').filter(Boolean);
  const routeParts = cleanRoute.split('/').filter(Boolean);
  if (patternParts.length !== routeParts.length) return false;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith('[') && patternParts[i].endsWith(']')) continue;
    if (patternParts[i] !== routeParts[i]) return false;
  }
  return true;
}

for (const f of tsxFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const href = m[1] || m[2];
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    allExtractedLinks.push({ file: path.relative(srcDir, f), href });
    // Check if matches any valid route
    const baseHref = href.split('?')[0];
    const isDynamic = baseHref.includes('$');
    let matched = false;
    for (const vr of validRoutes) {
      if (vr === baseHref) { matched = true; break; }
      if (routeMatches(vr, baseHref)) { matched = true; break; }
      // If baseHref is dynamic like /casos/${id}, check pattern
      if (isDynamic) {
        const regexStr = '^' + vr.replace(/\[\w+\]/g, '[^/]+') + '$';
        const dynamicAsRegex = '^' + baseHref.replace(/\$\{[^}]+\}/g, '[^/]+') + '$';
        // check if they could correspond
        const vrNormalized = vr.replace(/\[\w+\]/g, '*');
        const hrefNormalized = baseHref.replace(/\$\{[^}]+\}/g, '*');
        if (vrNormalized === hrefNormalized) { matched = true; break; }
      }
    }
    if (!matched) {
      deadLinks.push({ file: path.relative(srcDir, f), href });
    }
  }
}

console.log(`Total enlaces comprobados: ${allExtractedLinks.length}`);
if (deadLinks.length > 0) {
  console.log('ALERTA: Enlaces potencialmente rotos:');
  deadLinks.forEach(d => console.log(`  [${d.file}] -> ${d.href}`));
} else {
  console.log('Todos los enlaces apuntan a rutas válidas.');
}

console.log('\n--- 4. BOTONES SIN ACCIÓN NI TIPO ---');
const buttonRegex = /<Button\b([^>]*)>(.*?)<\/Button>/gs;
const ghostButtons = [];
for (const f of tsxFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = buttonRegex.exec(content)) !== null) {
    const attrs = m[1];
    const inner = m[2].trim().replace(/\s+/g, ' ').slice(0, 40);
    const hasOnClick = /onClick\b/.test(attrs);
    const hasType = /type=["']submit["']/.test(attrs);
    const hasForm = /form=/.test(attrs);
    const isAsChild = /asChild/.test(attrs);
    const isDisabled = /disabled\b/.test(attrs);
    if (!hasOnClick && !hasType && !hasForm && !isAsChild) {
      ghostButtons.push({ file: path.relative(srcDir, f), inner, attrs: attrs.trim() });
    }
  }
}

console.log(`Botones sin onClick ni type=submit ni asChild: ${ghostButtons.length}`);
ghostButtons.forEach(b => console.log(`  [${b.file}] "${b.inner}" -> ${b.attrs.slice(0, 60)}`));
