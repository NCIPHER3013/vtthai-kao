import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { subscribeTables } from '../../lib/convex';
import { fetchTables, fetchActiveSessionTableIds } from '../../lib/api/tables';

interface TableManagementProps {
  onSelectTable: (tableId: string) => void;
  heldOrders: { id: string, name: string, time: string, cart: any[] }[];
}

interface RestaurantTable {
  id: string;
  name: string;
  zone: string;
  capacity: number;
}

export default function TableManagement({ onSelectTable, heldOrders }: TableManagementProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeSessions, setActiveSessions] = useState<{table_id: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        const tablesData = await fetchTables();
        setTables(
          tablesData
            .filter(t => t.is_active)
            .sort((a, b) => a.zone.localeCompare(b.zone) || a.table_number.localeCompare(b.table_number))
            .map(t => ({
              id: t.id,
              name: t.table_number,
              zone: t.zone,
              capacity: t.capacity
            }))
        );

        await refreshOccupancy();

      } catch (err) {
        console.error('Error loading table data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadInitialData();

    // Subscribe to order changes to update occupancy in real-time
    const channel = subscribeTables(['table_sessions'], () => {
        refreshOccupancy();
      });

    return () => {
      channel();
    };
  }, []);

  const refreshOccupancy = async () => {
    try {
      const ids = await fetchActiveSessionTableIds();
      setActiveSessions(ids.map(table_id => ({ table_id })));
    } catch (err) {
      console.error('Error refreshing occupancy', err);
    }
  };

  const isTableOccupied = (tableId: string, tableName: string) => {
    const hasSession = activeSessions.some(s => s.table_id === tableId);
    if (hasSession) return true;

    const isLocal = heldOrders.some(o => o.name === tableName);
    return isLocal;
  };

  const zones = Array.from(new Set(tables.map(t => t.zone)));

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-theme-bg">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 animate-in fade-in bg-theme-bg overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif text-theme-ink">Table Layout</h2>
          <p className="text-theme-ink-dim uppercase tracking-wider text-[10px] mt-1">Select an active table to manage service</p>
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-wider font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></div>
            <span className="text-theme-ink-dim">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
            <span className="text-theme-ink-dim">Occupied</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {zones.map(zone => (
          <div key={zone}>
            <h3 className="font-serif text-xl border-b border-theme-border pb-2 mb-4 text-theme-ink flex items-center justify-between">
              {zone}
              <span className="text-xs font-sans text-theme-ink-dim uppercase tracking-wider">{tables.filter(t => t.zone === zone).length} Tables</span>
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {tables.filter(t => t.zone === zone).map(table => {
                const isOccupied = isTableOccupied(table.id, table.name);

                return (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table.name)}
                    className={`aspect-[4/3] flex flex-col items-center justify-center p-4 border transition-all duration-200 relative group
                      ${isOccupied 
                        ? 'bg-red-500/5 border-red-500 text-red-500 hover:bg-red-500/10' 
                        : 'bg-theme-surface border-theme-border text-theme-ink hover:border-theme-accent hover:text-theme-accent'}
                    `}
                  >
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className={`w-2 h-2 rounded-sm ${isOccupied ? 'bg-red-500/40' : 'bg-theme-border'}`}></div>
                      <div className={`w-2 h-2 rounded-sm ${isOccupied ? 'bg-red-500/40' : 'bg-theme-border'}`}></div>
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 text-[9px] font-mono text-theme-ink-dim">
                       <Users className="w-2.5 h-2.5" />
                       {table.capacity}
                    </div>
                    <h3 className="text-2xl font-serif mb-2 line-clamp-1">{table.name}</h3>
                    <div className={`uppercase tracking-wider text-[10px] flex items-center gap-1 ${isOccupied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isOccupied ? (
                        <>
                          <Users className="w-3 h-3" />
                          <span>View Ticket</span>
                        </>
                      ) : (
                        <span>Open Table</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
