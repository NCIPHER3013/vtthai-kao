const fs = require('fs');
const path = require('path');

const dir = 'd:/pos-lite/src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const standardBtnClass = 'bg-theme-accent text-black px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)] flex items-center gap-2';
const standardBtnClassSmall = 'bg-theme-accent text-black px-4 py-2 rounded-md font-bold uppercase tracking-wider text-xs hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)] flex items-center gap-2';

const replacements = [
  // Common header buttons
  {
    regex: /className="bg-theme-accent text-black px-6 py-3 font-semibold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: `className="${standardBtnClass}"`
  },
  {
    regex: /className="bg-theme-accent text-black px-4 py-2 text-sm uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: `className="${standardBtnClassSmall}"`
  },
  {
    regex: /className="bg-theme-accent text-black px-4 py-2 font-semibold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: `className="${standardBtnClassSmall}"`
  },
  {
    regex: /className="bg-theme-accent text-black px-6 py-2\.5 text-sm uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: `className="${standardBtnClass}"`
  },
  // If they somehow have text-xs instead of text-sm but same classes
  {
    regex: /className="bg-theme-accent text-black px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: `className="${standardBtnClassSmall}"`
  }
];

let changed = 0;
files.forEach(f => {
  const filepath = path.join(dir, f);
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  // Specific catch-all for bg-theme-accent text-black without rounded-md
  // We want to add rounded-md and shadow if it's missing, but we must be careful.
  // Using regex to inject rounded-md and shadow into any bg-theme-accent text-black that doesn't have it.
  content = content.replace(/className="bg-theme-accent text-black ([^"]*?)"/g, (match, classes) => {
    if (classes.includes('rounded-md') || classes.includes('rounded') || classes.includes('w-full') || classes.includes('rounded-xl') || classes.includes('rounded-lg')) {
      return match;
    }
    // Add rounded-md and shadow
    let newClasses = classes
      .replace(/transition-colors/g, 'transition-all')
      .replace(/font-semibold/g, 'font-bold');
      
    if (!newClasses.includes('shadow-')) {
      newClasses += ' shadow-[0_0_10px_rgba(197,160,89,0.2)]';
    }
    return `className="bg-theme-accent text-black rounded-md ${newClasses.trim()}"`;
  });

  // Similarly for cancel buttons/secondary buttons that don't have rounded
  content = content.replace(/className="bg-theme-surface border border-theme-border px-4 py-2 flex items-center gap-2 text-sm text-theme-ink hover:text-theme-accent transition-colors"/g, 'className="bg-theme-surface border border-theme-border px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold text-theme-ink hover:text-theme-accent hover:border-theme-accent transition-all shadow-sm"');
  
  content = content.replace(/className="bg-theme-surface border border-theme-border px-6 py-3 flex items-center gap-2 text-sm text-theme-ink hover:text-theme-accent transition-colors"/g, 'className="bg-theme-surface border border-theme-border px-6 py-3 rounded-md flex items-center gap-2 text-sm font-bold text-theme-ink hover:text-theme-accent hover:border-theme-accent transition-all shadow-sm"');

  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + f);
    changed++;
  }
});
console.log(`Updated ${changed} files`);
