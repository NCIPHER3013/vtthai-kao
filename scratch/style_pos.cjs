const fs = require('fs');
const path = require('path');

const filepath = 'd:/pos-lite/src/pages/pos/POSPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const replacements = [
  // 1. Product Grid Items
  {
    regex: /className={`bg-theme-surface border border-theme-border flex flex-col text-left h-36 group relative p-5 transition-all \${/g,
    replace: 'className={`bg-theme-surface border border-theme-border rounded-xl shadow-sm flex flex-col text-left h-36 group relative p-5 transition-all hover:shadow-[0_0_15px_rgba(197,160,89,0.15)] ${'
  },
  
  // 2. Open Item Button
  {
    regex: /className="bg-theme-surface border border-dashed border-theme-border flex flex-col items-center justify-center h-36 hover:border-theme-accent transition-all group"/g,
    replace: 'className="bg-theme-surface border border-dashed border-theme-border rounded-xl shadow-sm flex flex-col items-center justify-center h-36 hover:border-theme-accent hover:shadow-[0_0_15px_rgba(197,160,89,0.15)] transition-all group"'
  },
  
  // 3. Category Side Menu Buttons
  {
    regex: /className={`text-left w-full transition-all group border-l-\[4px\] \${/g,
    replace: 'className={`text-left w-full transition-all group px-4 py-1.5 ${'
  },
  {
    regex: /\? 'bg-theme-bg border-theme-accent text-theme-ink font-medium shadow-sm'/g,
    replace: "? 'bg-theme-accent/10 text-theme-accent font-bold rounded-xl shadow-sm border border-theme-accent/20'"
  },
  {
    regex: /: 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-bg\/50 border-transparent'/g,
    replace: ": 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-bg/50 border border-transparent rounded-xl'"
  },
  {
    regex: /className="flex items-center gap-3 px-6 py-4"/g,
    replace: 'className="flex items-center gap-3 px-4 py-3"'
  },
  
  // 4. Search Input
  {
    regex: /className="w-full pl-10 pr-10 py-2\.5 bg-theme-surface border border-theme-border rounded-sm text-sm text-theme-ink placeholder:text-theme-ink-dim focus:outline-none focus:border-theme-accent transition-colors"/g,
    replace: 'className="w-full pl-10 pr-10 py-3 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-sm text-theme-ink placeholder:text-theme-ink-dim focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"'
  },

  // 5. Order Type Toggle
  {
    regex: /<div className="flex border-b border-theme-border">/g,
    replace: '<div className="flex gap-2 p-4 border-b border-theme-border bg-theme-bg">'
  },
  {
    regex: /className={`flex-1 py-3 text-\[10px\] uppercase font-bold tracking-widest transition-all \${/g,
    replace: 'className={`flex-1 py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${'
  },
  {
    regex: /\? 'bg-theme-accent text-black' : 'text-theme-ink-dim hover:text-theme-ink'/g,
    replace: "? 'bg-theme-accent text-black shadow-[0_0_10px_rgba(197,160,89,0.3)]' : 'bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent'"
  },
  
  // 6. Right Sidebar Containers
  {
    regex: /<aside className="w-96 bg-theme-surface-alt border-l border-theme-border flex flex-col">/g,
    replace: '<aside className="w-[400px] bg-theme-surface-alt border-l border-theme-border flex flex-col">'
  },
  
  // 7. Checkout Buttons
  {
    regex: /className="py-4 border border-theme-border text-\[10px\] font-bold uppercase tracking-widest hover:border-theme-accent transition-all disabled:opacity-50"/g,
    replace: 'className="py-4 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-[10px] font-bold uppercase tracking-widest hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50"'
  },
  {
    regex: /className="py-4 bg-theme-accent text-black text-\[10px\] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50"/g,
    replace: 'className="py-4 bg-theme-accent text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 shadow-[0_0_15px_rgba(197,160,89,0.25)] transition-all disabled:opacity-50"'
  },
  
  // 8. Hold/Send and Print Bill buttons
  {
    regex: /className="flex-1 py-3 text-\[10px\] font-bold uppercase tracking-widest text-theme-ink-dim hover:text-theme-ink transition-colors"/g,
    replace: 'className="flex-1 py-3 bg-theme-bg border border-theme-border rounded-lg text-[10px] font-bold uppercase tracking-widest text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent transition-all"'
  },
  
  // 9. Active Table & Customer Banners
  {
    regex: /<div className="px-6 py-2\.5 bg-theme-accent\/20 border-b border-theme-border flex items-center justify-between">/g,
    replace: '<div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-between shadow-sm">'
  },
  {
    regex: /<div className="px-6 py-2\.5 bg-theme-accent\/10 border-b border-theme-border flex items-center justify-between">/g,
    replace: '<div className="mx-4 mt-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between shadow-sm">'
  },
  
  // 10. Header Exit Button
  {
    regex: /className="px-4 py-2 border border-red-500\/30 text-\[10px\] uppercase tracking-widest font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-sm"/g,
    replace: 'className="px-4 py-2 border border-red-500/30 rounded-md text-[10px] uppercase tracking-widest font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"'
  },
  
  // 11. Cart Item Quantity Controls
  {
    regex: /<div className="flex items-center gap-2 bg-theme-bg p-1 border border-theme-border rounded-sm">/g,
    replace: '<div className="flex items-center gap-2 bg-theme-surface p-1 border border-theme-border rounded-md shadow-sm">'
  }
];

replacements.forEach(r => {
  content = content.replace(r.regex, r.replace);
});

fs.writeFileSync(filepath, content);
console.log('POSPage updated successfully.');
