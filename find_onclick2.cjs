const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /<([a-zA-Z0-9_]+)([^>]*?)onClick\s*=\s*(?:\{[^}]*\}|"[^"]*"|'[^']*')([^>]*?)>/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const tagName = match[1];
      const attributes = match[2] + match[3];
      if (!['button', 'Button'].includes(tagName)) {
        if (!attributes.includes('cursor-pointer')) {
          console.log(`${filePath} -> <${tagName}> missing cursor-pointer`);
        }
      }
    }
  }
});
