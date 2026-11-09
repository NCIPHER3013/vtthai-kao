const fs = require('fs');
const path = require('path');

const dir = 'd:/pos-lite/src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  // Modal wrappers
  {
    regex: /className="bg-theme-surface border border-theme-border w-full (max-w-\w+) shadow-2xl flex flex-col"/g,
    replace: 'className="bg-theme-surface border border-theme-border w-full $1 shadow-2xl flex flex-col rounded-xl overflow-hidden"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border w-full (max-w-\w+) shadow-2xl flex flex-col rounded-lg"/g,
    replace: 'className="bg-theme-surface border border-theme-border w-full $1 shadow-2xl flex flex-col rounded-xl overflow-hidden"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border w-full (max-w-\w+) shadow-2xl flex flex-col max-h-\[.*?\]"/g,
    replace: 'className="bg-theme-surface border border-theme-border w-full $1 shadow-2xl flex flex-col rounded-xl overflow-hidden max-h-[90vh]"'
  },
  
  // Standard Inputs & Selects
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent font-mono"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent appearance-none capitalize"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all appearance-none capitalize"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-2\.5 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },
  {
    regex: /className="flex-1 bg-theme-bg border border-theme-border p-2 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"/g,
    replace: 'className="flex-1 bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },
  {
    regex: /className="w-32 bg-theme-bg border border-theme-border p-2 text-sm text-theme-ink focus:outline-none focus:border-theme-accent font-mono"/g,
    replace: 'className="w-32 bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-4 text-lg text-theme-ink focus:outline-none focus:border-theme-accent font-mono text-center"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-4 rounded-md text-lg text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono text-center"'
  },
  
  // Textareas
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent resize-none min-h-\[100px\]"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all resize-none min-h-[100px]"'
  },
  {
    regex: /className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },

  // Cancel Buttons
  {
    regex: /className="px-6 py-3 text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink font-medium"/g,
    replace: 'className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"'
  },
  {
    regex: /className="px-4 py-2 text-xs text-theme-ink-dim hover:text-theme-ink"/g,
    replace: 'className="px-4 py-2 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"'
  },

  // Save Buttons
  {
    regex: /className="bg-theme-accent text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"/g,
    replace: 'className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"'
  },
  {
    regex: /className="bg-theme-accent text-black px-6 py-2\.5 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"/g,
    replace: 'className="bg-theme-accent text-black px-6 py-2.5 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"'
  },
  {
    regex: /className="w-full bg-theme-accent text-black p-2\.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-50 hover:bg-opacity-90"/g,
    replace: 'className="w-full bg-theme-accent text-black p-3 rounded-md text-xs uppercase tracking-wider font-bold disabled:opacity-50 hover:bg-opacity-90 shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all"'
  },
  {
    regex: /className="w-full bg-theme-accent text-black p-3 text-xs uppercase tracking-wider font-semibold disabled:opacity-50 hover:bg-opacity-90"/g,
    replace: 'className="w-full bg-theme-accent text-black p-3 rounded-md text-xs uppercase tracking-wider font-bold disabled:opacity-50 hover:bg-opacity-90 shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all"'
  },
  
  // Specific Buttons
  {
    regex: /className="bg-emerald-400 text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"/g,
    replace: 'className="bg-emerald-400 text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(52,211,153,0.2)]"'
  },
  {
    regex: /className="bg-theme-accent text-black px-4 flex items-center text-xs uppercase tracking-wider font-semibold disabled:opacity-50"/g,
    replace: 'className="bg-theme-accent text-black px-4 rounded-md flex items-center text-xs uppercase tracking-wider font-bold disabled:opacity-50 shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all hover:bg-opacity-90"'
  },
  
  // Form Labels
  {
    regex: /className="block text-\[11px\] uppercase tracking-wider text-theme-ink-dim mb-2"/g,
    replace: 'className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2"'
  },
  {
    regex: /className="block text-xs text-theme-ink-dim mb-1"/g,
    replace: 'className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2"'
  }
];

let changedFiles = 0;
for (const file of files) {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf-8');
  let original = content;

  for (const { regex, replace } of replacements) {
    content = content.replace(regex, replace);
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log(`Updated ${file}`);
    changedFiles++;
  }
}
console.log(`Updated ${changedFiles} files`);
