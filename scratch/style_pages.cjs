const fs = require('fs');
const path = require('path');

const files = ['StaffPage.tsx', 'CRMPage.tsx', 'PurchaseOrderPage.tsx', 'StocktakePage.tsx'];

const replacements = [
  // Tables
  {
    regex: /className="bg-theme-surface border border-theme-border overflow-hidden"/g,
    replace: 'className="bg-theme-surface border border-theme-border overflow-hidden rounded-xl shadow-sm"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border overflow-hidden mt-6"/g,
    replace: 'className="bg-theme-surface border border-theme-border overflow-hidden mt-6 rounded-xl shadow-sm"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border p-6"/g,
    replace: 'className="bg-theme-surface border border-theme-border p-6 rounded-xl shadow-sm"'
  },
  
  // Header Buttons
  {
    regex: /className="bg-theme-accent text-black px-6 py-3 font-semibold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2"/g,
    replace: 'className="bg-theme-accent text-black px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)] flex items-center gap-2"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border px-4 py-3 flex items-center gap-2 text-sm text-theme-ink hover:text-theme-accent transition-colors"/g,
    replace: 'className="bg-theme-surface border border-theme-border px-4 py-3 rounded-md flex items-center gap-2 text-sm font-bold text-theme-ink hover:text-theme-accent hover:border-theme-accent transition-all shadow-sm"'
  },
  {
    regex: /className="bg-theme-surface border border-theme-border px-6 py-3 font-semibold uppercase tracking-wider text-sm hover:text-theme-accent hover:border-theme-accent transition-colors flex items-center gap-2"/g,
    replace: 'className="bg-theme-surface border border-theme-border px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:text-theme-accent hover:border-theme-accent transition-all shadow-sm flex items-center gap-2"'
  },
  
  // Info Boxes
  {
    regex: /className="bg-theme-accent\/5 border border-theme-accent\/20 p-6 flex gap-4 items-start"/g,
    replace: 'className="bg-theme-accent/5 border border-theme-accent/20 p-6 rounded-xl flex gap-4 items-start shadow-sm"'
  },
  {
    regex: /className="bg-emerald-500\/5 border border-emerald-500\/20 p-6 flex gap-4 items-start"/g,
    replace: 'className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-xl flex gap-4 items-start shadow-sm"'
  },

  // Missing Inputs
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm focus:outline-none focus:border-theme-accent transition-colors"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 text-sm focus:outline-none focus:border-theme-accent transition-colors text-theme-ink appearance-none"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all appearance-none"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border p-3 pl-10 text-sm font-mono tracking-widest focus:outline-none focus:border-theme-accent transition-colors"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border p-3 pl-10 rounded-md text-sm font-mono tracking-widest focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },
  {
    regex: /className="w-full bg-theme-bg border border-theme-border pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-theme-accent transition-colors"/g,
    replace: 'className="w-full bg-theme-bg border border-theme-border pl-10 pr-4 py-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  }
];

files.forEach(f => {
  const filepath = path.join('d:/pos-lite/src/pages/admin', f);
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  fs.writeFileSync(filepath, content);
  console.log('Updated ' + f);
});
