import { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { runDatabaseDiagnostics, TestResult } from '../../lib/dbDiagnostics';

const ALL_TABLES = [
  'settings', 'staff_pins', 'restaurant_tables',
  'products', 'product_categories', 
  'orders', 'order_items', 'shifts',
  'stock_items', 'inventory_ledger', 'recipes', 'sub_recipe_ingredients', 
  'suppliers', 'item_suppliers', 'purchase_orders', 'purchase_order_items',
  'customers', 'gift_cards', 'gift_card_transactions'
];

export default function DatabaseDiagnosticsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    const testResults = await runDatabaseDiagnostics(ALL_TABLES);
    setResults(testResults);
    setIsRunning(false);
  };

  const passedCount = results.filter(r => r.status === 'passed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-theme-ink flex items-center gap-3">
            <Database className="w-8 h-8 text-theme-accent" />
            Database Connectivity Check
          </h1>
          <p className="text-theme-ink-dim mt-2">
            Run automated diagnostics to ensure all Phase 2 database tables are created and accessible.
          </p>
        </div>
        <button 
          onClick={runTests}
          disabled={isRunning}
          className="bg-theme-accent text-black rounded-md font-bold uppercase tracking-wider text-sm px-6 py-3 flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-50 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run Diagnostics
        </button>
      </div>

      <div className="bg-theme-surface border border-theme-border p-6 font-mono text-sm">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-theme-border">
          <span className="text-theme-ink-dim">Test Suite: Phase 2 Table Audit</span>
          <span className="font-semibold text-theme-accent">Score: {passedCount} / {ALL_TABLES.length} Passed</span>
        </div>

        <div className="space-y-3">
          {results.length === 0 && isRunning && (
             <div className="text-center p-8 text-theme-ink-dim flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-theme-accent" />
                Connecting to database...
             </div>
          )}

          {results.map((res, i) => (
            <div key={i} className={`flex items-start gap-4 p-3 border ${res.status === 'passed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              {res.status === 'passed' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : res.status === 'missing_table' ? (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              
              <div className="flex-1">
                <div className="flex justify-between">
                  <strong className={res.status === 'passed' ? 'text-emerald-600' : 'text-red-500'}>
                    {res.tableName}
                  </strong>
                  <span className="text-xs uppercase tracking-widest text-theme-ink-dim">
                    {res.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-theme-ink-dim mt-1">{res.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
