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
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('onClick=')) {
        let tagContext = '';
        for (let j = Math.max(0, i - 10); j <= Math.min(lines.length - 1, i + 10); j++) {
           tagContext += lines[j] + '\n';
           if (lines[j].includes('>')) break;
        }
        
        // Match tag block loosely
        const match = tagContext.match(/<([a-zA-Z0-9_]+)[^>]*onClick/);
        if (match) {
           const tagName = match[1];
           if (!['button', 'Button'].includes(tagName)) {
             // Check if it has cursor-pointer
             if (!tagContext.includes('cursor-pointer')) {
                console.log(`${filePath}:${i+1} -> <${tagName}> missing cursor-pointer`);
             }
           }
        }
      }
    }
  }
});
