import { useState, useEffect } from 'react';
import { Search, Plus, FileText, ArrowLeft, ArrowRight, Printer, AlertCircle, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Supplier, StockItem, PurchaseOrder, PurchaseOrderItem } from '../../lib/supabase';
import { fetchInventory, fetchSuppliers, fetchPurchaseOrders, fetchPurchaseOrderItems, createPurchaseOrder, createPurchaseOrderItems, receivePurchaseOrderAtomic, checkTableExists, fetchItemSuppliers } from '../../lib/api/inventory';
import { DbError } from '../../lib/api/errors';
import formatCurrency from '../../lib/formatCurrency';
import { useSettings } from '../../hooks/useSettings';

export default function PurchaseOrderPage() {
  const { storeName } = useSettings();
  const [hasTables, setHasTables] = useState<boolean | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedPOItems, setSelectedPOItems] = useState<PurchaseOrderItem[]>([]);
  
  // New PO State
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    expected_date: '',
    notes: ''
  });
  const [poLines, setPoLines] = useState<{inventory_item_id: string, quantity: number, price: number}[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setIsLoading(true);
    const tblExists = await checkTableExists('purchase_orders');
    setHasTables(tblExists);
    
    if (tblExists) {
      await fetchData();
    }
    setIsLoading(false);
  }

  async function fetchData() {
    try {
      const [pos, sups, items] = await Promise.all([
        fetchPurchaseOrders(),
        fetchSuppliers(),
        fetchInventory()
      ]);

      setPurchaseOrders(pos);
      setSuppliers(sups);
      setStockItems(items);
    } catch (err) {
      console.error('Error fetching POs', err);
    }
  }

  const loadPODetails = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsLoading(true);
    setView('detail');
    try {
      const items = await fetchPurchaseOrderItems(po.id);
      setSelectedPOItems(items);
    } catch (err) {
      console.error('Error loading PO items', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startCreatePO = async () => {
    if (suppliers.length === 0 || stockItems.length === 0) {
      await fetchData();
    }
    setPoForm({ supplier_id: '', expected_date: '', notes: '' });
    setPoLines([]);
    setView('create');
  };

  const addLine = () => {
    setPoLines([...poLines, { inventory_item_id: '', quantity: 1, price: 0 }]);
  };

  const updateLine = async (idx: number, field: string, value: any) => {
    const updated = [...poLines];
    (updated[idx] as any)[field] = value;
    
    if (field === 'inventory_item_id' && poForm.supplier_id) {
      const itemId = String(value);
      const item = stockItems.find(s => s.id === itemId);

      try {
        const allSupplierQuotes = await fetchItemSuppliers(itemId);
        const match = allSupplierQuotes.find(sq => sq.supplier_id === poForm.supplier_id);
        if (match?.price) {
          updated[idx].price = match.price;
        } else if (item && item.cost_per_unit) {
          updated[idx].price = item.cost_per_unit;
        }
      } catch (err) {
        if (item && item.cost_per_unit) {
          updated[idx].price = item.cost_per_unit;
        }
      }
    } else if (field === 'inventory_item_id' && !poForm.supplier_id) {
      const item = stockItems.find(s => String(s.id) === String(value));
      if (item && item.cost_per_unit) {
         updated[idx].price = item.cost_per_unit;
      }
    }
    
    setPoLines(updated);
  };

  const removeLine = (idx: number) => {
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  const saveDraftPO = async () => {
    if (!poForm.supplier_id) return alert('Please select a supplier');
    if (poLines.length === 0) return alert('Please add at least one item');
    if (poLines.some(l => !l.inventory_item_id || l.quantity <= 0)) return alert('Please fill in all item quantities properly');

    const total = poLines.reduce((acc, line) => acc + (line.quantity * line.price), 0);
    const poNumber = 'PO-' + new Date().getTime().toString().slice(-6);

    setIsLoading(true);
    try {
      const poData = await createPurchaseOrder({
        po_number: poNumber,
        supplier_id: poForm.supplier_id,
        status: 'ordered',
        total_amount: total,
        expected_date: poForm.expected_date || undefined,
        notes: poForm.notes
      });

      const linePayload = poLines.map(l => ({
        po_id: poData.id,
        inventory_item_id: l.inventory_item_id,
        quantity_ordered: l.quantity,
        unit_price: l.price,
        total_price: l.quantity * l.price
      }));

      await createPurchaseOrderItems(linePayload as any);

      await fetchData();
      setView('list');
    } catch (err: any) {
      console.error(err);
      alert('Error saving PO: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const receivePO = async () => {
    if (!selectedPO) return;
    if (!confirm('Are you sure you want to mark this PO as received? Inventory quantities will be updated immediately.')) return;

    setIsLoading(true);
    try {
      await receivePurchaseOrderAtomic(
        selectedPO.id,
        selectedPOItems.map(item => ({
          inventory_item_id: item.inventory_item_id,
          quantity_received: item.quantity_ordered,
          unit_price: item.unit_price
        })),
        selectedPO.po_number
      );

      alert('Purchase Order successfully received. Inventory has been updated.');
      await fetchData();
      setView('list');
    } catch (err: any) {
      console.error(err);
      alert('Error receiving PO: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPO = () => {
    if (!selectedPO) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the Purchase Order.');
      return;
    }

    const supplierName = (selectedPO as any).suppliers?.name || 'Unknown';
    const expectedDateStr = selectedPO.expected_date ? new Date(selectedPO.expected_date).toLocaleDateString() : 'TBD';
    const notesStr = selectedPO.notes || '-';
    const totalAmountStr = formatCurrency(selectedPO.total_amount);

    const itemsRows = selectedPOItems.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 0; font-weight: 600; color: #111827; text-align: left;">
          ${(item as any).stock_items?.name || 'Unknown Item'}
          <span style="font-size: 11px; font-weight: 400; color: #6b7280; display: block;">Unit: ${(item as any).stock_items?.unit || '-'}</span>
        </td>
        <td style="padding: 10px 0; text-align: center; font-family: monospace;">${item.quantity_ordered}</td>
        <td style="padding: 10px 0; text-align: center; font-family: monospace;">${selectedPO.status === 'received' ? item.quantity_received : '-'}</td>
        <td style="padding: 10px 0; text-align: right; color: #374151;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(item.total_price)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${selectedPO.po_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 40px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 5px 0;
          }
          .subtitle {
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 10px;
            font-weight: 700;
            color: #4b5563;
          }
          .meta-grid {
            display: grid;
            grid-template-cols: repeat(2, 1fr);
            gap: 20px;
            background: #f9fafb;
            padding: 20px;
            border: 1px solid #e5e7eb;
            margin-bottom: 30px;
          }
          .meta-item label {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #9ca3af;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .meta-item value {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          th {
            border-bottom: 2px solid #e5e7eb;
            color: #4b5563;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding-bottom: 10px;
            font-weight: 700;
          }
          .total-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 60px;
          }
          .total-box {
            text-align: right;
            border-top: 2px solid #111827;
            padding-top: 15px;
            width: 250px;
          }
          .total-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #4b5563;
            font-weight: bold;
          }
          .total-val {
            font-size: 22px;
            font-weight: bold;
            color: #111827;
            margin-top: 5px;
          }
          .signatures {
            display: grid;
            grid-template-cols: repeat(2, 1fr);
            gap: 100px;
            margin-top: 80px;
            padding-top: 40px;
          }
          .sig-line {
            border-top: 1px solid #9ca3af;
            text-align: center;
            padding-top: 10px;
            font-size: 11px;
            color: #4b5563;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Purchase Order</h1>
            <div class="subtitle">${storeName || 'Vermont Thai'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: bold; color: #111827;">${selectedPO.po_number}</div>
            <div style="color: #6b7280; font-size: 11px; margin-top: 4px;">Issued: ${new Date(selectedPO.created_at || '').toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>Supplier</label>
            <div style="font-size: 14px; font-weight: 600; color: #111827;">${supplierName}</div>
          </div>
          <div class="meta-item">
            <label>Expected Date</label>
            <div style="font-size: 14px; font-weight: 600; color: #111827;">${expectedDateStr}</div>
          </div>
          <div class="meta-item" style="grid-column: span 2;">
            <label>Notes</label>
            <div style="font-size: 12px; color: #4b5563; white-space: pre-wrap;">${notesStr}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; width: 40%;">Material / Item</th>
              <th style="text-align: center; width: 15%;">Qty Ordered</th>
              <th style="text-align: center; width: 15%;">Qty Received</th>
              <th style="text-align: right; width: 15%;">Unit Cost</th>
              <th style="text-align: right; width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-box">
            <span class="total-label">Total Amount</span>
            <div class="total-val">${totalAmountStr}</div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-line">Prepared & Authorized By</div>
          <div class="sig-line">Supplier Acknowledgment & Received By</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (hasTables === false) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Purchase Orders Tables Missing</h2>
          <p className="text-red-600 mb-6">The database tables required to manage Purchase Orders are not set up yet.</p>
          
          <div className="text-left bg-white p-4 rounded border border-gray-200 overflow-x-auto">
            <p className="text-sm font-semibold mb-2">Please run the following SQL script in your Supabase SQL Editor:</p>
            <pre className="text-xs text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">
{`CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES stock_items(id),
  quantity_ordered NUMERIC NOT NULL,
  quantity_received NUMERIC DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
            </pre>
          </div>
          <button 
            onClick={init}
            className="mt-6 bg-theme-accent text-black font-bold uppercase tracking-wider px-6 py-3 rounded shadow hover:bg-opacity-90"
          >
            I have run the script, try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Purchasing & Receiving</h1>
          <p className="text-theme-ink-dim text-sm">Create purchase orders and manage incoming inventory directly from suppliers.</p>
        </div>
        {view === 'list' && (
          <button 
            onClick={startCreatePO}
            className="bg-theme-accent text-black rounded-md px-4 py-2 font-bold flex items-center gap-2 uppercase tracking-wide text-xs hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)]"
          >
            <Plus className="w-4 h-4" /> New PO
          </button>
        )}
        {(view === 'create' || view === 'detail') && (
          <button 
            onClick={() => setView('list')}
            className="bg-theme-surface border border-theme-border text-theme-ink px-4 py-2 font-bold flex items-center gap-2 uppercase tracking-wide text-xs hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-theme-accent animate-spin" />
        </div>
      ) : view === 'list' ? (
        <div className="text-stone-900 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-widest text-gray-500">
                <th className="p-4 font-semibold">PO Number</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Supplier</th>
                <th className="p-4 font-semibold">Expected</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No purchase orders found.</p>
                    <button onClick={startCreatePO} className="text-theme-accent font-semibold mt-2 hover:underline">Create your first PO</button>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map(po => (
                  <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono text-sm font-semibold text-stone-900">{po.po_number || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(po.created_at || '').toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-medium text-stone-900">{(po as any).suppliers?.name || 'Unknown Supplier'}</td>
                    <td className="p-4 text-sm text-gray-600">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : 'TBD'}</td>
                    <td className="p-4 text-sm font-medium text-stone-900">{formatCurrency(po.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${
                        po.status === 'ordered' ? 'bg-amber-100 text-amber-800' :
                        po.status === 'received' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => loadPODetails(po)}
                        className="text-theme-accent hover:text-black transition-colors p-2"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : view === 'create' ? (
        <div className="text-stone-900 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-serif mb-6 border-b pb-4">Create Purchase Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-semibold">Supplier</label>
              <select 
                value={poForm.supplier_id} 
                onChange={e => setPoForm({...poForm, supplier_id: e.target.value})}
                className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent focus:outline-none"
              >
                <option value="" className="text-stone-900">-- Select Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id} className="text-stone-900">{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-semibold">Expected Delivery Date (Optional)</label>
              <input 
                type="date" 
                value={poForm.expected_date}
                onChange={e => setPoForm({...poForm, expected_date: e.target.value})}
                className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-semibold">Notes</label>
              <input 
                type="text"
                placeholder="e.g. Please deliver to back door..." 
                value={poForm.notes}
                onChange={e => setPoForm({...poForm, notes: e.target.value})}
                className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent focus:outline-none"
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 border-b pb-2">Line Items</h3>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6 text-sm text-blue-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Smart Supplier Pricing</p>
              <p>When you select a supplier and choose an item, the system automatically fetches their unique quoted price if it exists. Otherwise, it falls back to your default cost.</p>
            </div>
          </div>

          {poLines.map((line, idx) => (
            <div key={idx} className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <label className="block text-[10px] uppercase text-gray-500 mb-1">Item</label>
                <select 
                  value={line.inventory_item_id}
                  onChange={e => updateLine(idx, 'inventory_item_id', e.target.value)}
                  className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent"
                >
                  <option value="" className="text-stone-900">-- Select Material --</option>
                  {stockItems.map(s => (
                    <option key={s.id} value={s.id} className="text-stone-900">{s.name} ({s.unit})</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-[10px] uppercase text-gray-500 mb-1">Qty</label>
                <input 
                  type="number" min="1" step="any"
                  value={line.quantity || ''}
                  onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent"
                />
              </div>
              <div className="w-32">
                <label className="block text-[10px] uppercase text-gray-500 mb-1">Unit Cost ($)</label>
                <input 
                  type="number" min="0" step="0.01"
                  value={line.price || ''}
                  onChange={e => updateLine(idx, 'price', Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 text-sm text-stone-900 bg-white focus:border-theme-accent"
                />
              </div>
              <div className="w-24 pb-2 text-right font-medium">
                {formatCurrency(line.quantity * line.price)}
              </div>
              <button 
                onClick={() => removeLine(idx)}
                className="p-2 mb-1 text-red-500 hover:bg-red-50 rounded"
              >
                Clear
              </button>
            </div>
          ))}

          <button 
            onClick={addLine}
            className="text-theme-accent font-semibold text-sm hover:underline flex items-center gap-1 mt-2"
          >
            <Plus className="w-4 h-4"/> Add Item Line
          </button>

          <div className="mt-12 flex justify-between items-center border-t pt-6 border-gray-200">
            <div className="text-xl font-bold">
              Total: {formatCurrency(poLines.reduce((acc, l) => acc + (l.quantity * l.price), 0))}
            </div>
            <button 
              onClick={saveDraftPO}
              disabled={poLines.length === 0}
              className="bg-black text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Issue Purchase Order
            </button>
          </div>
        </div>
      ) : (
        selectedPO && (
          <div className="text-stone-900 bg-white border flex flex-col md:flex-row border-gray-200 rounded-lg shadow-sm p-0 overflow-hidden">
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-gray-200">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">{selectedPO.po_number}</h2>
                   <p className="text-gray-500 text-sm">Issued: {new Date(selectedPO.created_at || '').toLocaleString()}</p>
                 </div>
                 <span className={`px-3 py-1 text-[11px] uppercase font-bold tracking-wider rounded-sm ${
                        selectedPO.status === 'ordered' ? 'bg-amber-100 text-amber-800' :
                        selectedPO.status === 'received' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                  }`}>
                    Status: {selectedPO.status}
                 </span>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded text-sm">
                 <div>
                   <span className="block text-gray-400 text-xs uppercase mb-1">Supplier</span>
                   <span className="font-semibold">{(selectedPO as any).suppliers?.name || 'Unknown'}</span>
                 </div>
                 <div>
                   <span className="block text-gray-400 text-xs uppercase mb-1">Expected Date</span>
                   <span className="font-semibold">{selectedPO.expected_date ? new Date(selectedPO.expected_date).toLocaleDateString() : 'TBD'}</span>
                 </div>
                 <div className="col-span-2">
                   <span className="block text-gray-400 text-xs uppercase mb-1">Notes</span>
                   <span className="font-medium text-gray-700">{selectedPO.notes || '-'}</span>
                 </div>
               </div>

               <table className="w-full text-left text-sm">
                 <thead>
                   <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-widest text-[10px]">
                     <th className="pb-2">Material / Item</th>
                     <th className="pb-2">Order Qty</th>
                     <th className="pb-2">Recv Qty</th>
                     <th className="pb-2">Unit Cost</th>
                     <th className="pb-2 text-right">Total</th>
                   </tr>
                 </thead>
                 <tbody>
                   {selectedPOItems.map(item => (
                     <tr key={item.id} className="border-b border-gray-100">
                       <td className="py-3 font-semibold">{(item as any).stock_items?.name || 'Unknown Item'} <span className="text-xs font-normal text-gray-400">({(item as any).stock_items?.unit})</span></td>
                       <td className="py-3 font-mono">{item.quantity_ordered}</td>
                       <td className="py-3 font-mono">{selectedPO.status === 'received' ? item.quantity_received : '-'}</td>
                       <td className="py-3 text-gray-600">{formatCurrency(item.unit_price)}</td>
                       <td className="py-3 text-right font-medium">{formatCurrency(item.total_price)}</td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot>
                   <tr>
                     <td colSpan={4} className="py-4 text-right font-bold uppercase tracking-widest text-xs">Total Amount</td>
                     <td className="py-4 text-right font-bold text-lg">{formatCurrency(selectedPO.total_amount)}</td>
                   </tr>
                 </tfoot>
               </table>
            </div>
            
            <div className="w-full md:w-80 bg-gray-50 border-l border-gray-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg mb-4">Actions</h3>
                {selectedPO.status === 'ordered' && (
                  <div className="mb-4 bg-white p-4 rounded border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-600 mb-4 line-height-relaxed">
                      Verify that all items arrived from the supplier before marking as received. This will automatically update your inventory stock.
                    </p>
                    <button 
                      onClick={receivePO}
                      className="w-full bg-theme-accent text-black font-bold uppercase tracking-widest text-xs py-3 rounded shadow hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Receive Goods
                    </button>
                  </div>
                )}
                {selectedPO.status === 'received' && (
                  <div className="text-center p-6 text-green-700 bg-green-50 border border-green-200 rounded">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-70" />
                    <p className="font-semibold text-sm">Goods Received</p>
                    <p className="text-[10px] uppercase tracking-wider mt-1 opacity-80">Inventory is updated</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handlePrintPO}
                className="w-full bg-white border border-gray-300 text-gray-700 font-semibold uppercase tracking-widest text-xs py-3 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print PO
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
