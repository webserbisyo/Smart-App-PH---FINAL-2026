import fs from 'node:fs';
import path from 'node:path';

function stripInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'cache') {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        stripInDir(fullPath);
      }
    } else if (entry.isFile() && /\.(js|mjs|map|pack|json|html|txt)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('localhost')) {
          const replaced = content.replaceAll('localhost', '127.0.0.1');
          fs.writeFileSync(fullPath, replaced, 'utf8');
        }
      } catch {
        // Ignore read/write failures on locked files
      }
    }
  }
}

const nextDir = path.resolve(import.meta.dirname, '../.next');
stripInDir(nextDir);
