import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu as MenuIcon, Package, Settings, LogOut, Store, Receipt, Users, ChefHat, Clock, BarChart3, Database, CheckSquare, ClipboardCheck, TrendingUp, DollarSign, ChevronDown, ChevronRight, X, CalendarDays, Pencil, Globe } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { convex, api, getToken, setToken } from '../lib/convex';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
      { path: '/admin/super', icon: <LayoutDashboard className="w-5 h-5 text-theme-accent" />, label: 'Owner Overview' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/admin/orders', icon: <Receipt className="w-5 h-5" />, label: 'Orders' },
      { path: '/admin/online-ordering', icon: <Globe className="w-5 h-5" />, label: 'Online Ordering' },
      { path: '/admin/bookings', icon: <CalendarDays className="w-5 h-5" />, label: 'Table Bookings' },
      { path: '/admin/blog', icon: <Pencil className="w-5 h-5" />, label: 'Blog Posts' },
      { path: '/admin/shifts', icon: <Clock className="w-5 h-5" />, label: 'Shifts' },
      { path: '/admin/tables', icon: <Store className="w-5 h-5" />, label: 'Table Management' },
    ]
  },
  {
    title: 'Menu & Kitchen',
    items: [
      { path: '/admin/menu', icon: <MenuIcon className="w-5 h-5" />, label: 'Menu' },
      { path: '/admin/recipe', icon: <ChefHat className="w-5 h-5" />, label: 'Recipe Management' },
    ]
  },
  {
    title: 'Inventory & Purchasing',
    items: [
      { path: '/admin/inventory', icon: <Package className="w-5 h-5" />, label: 'Inventory' },
      { path: '/admin/purchasing', icon: <Receipt className="w-5 h-5" />, label: 'Purchase Orders' },
      { path: '/admin/stocktake', icon: <ClipboardCheck className="w-5 h-5" />, label: 'Stocktake' },
    ]
  },
  {
    title: 'People',
    items: [
      { path: '/admin/crm', icon: <Users className="w-5 h-5" />, label: 'Customers' },
      { path: '/admin/staff', icon: <Users className="w-5 h-5" />, label: 'Staff & Roles' },
    ]
  },
  {
    title: 'Reports & Finance',
    items: [
      { path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" />, label: 'Reports & Analytics' },
      { path: '/admin/menu-analysis', icon: <TrendingUp className="w-5 h-5" />, label: 'Menu Analysis' },
      { path: '/admin/profit-loss', icon: <DollarSign className="w-5 h-5" />, label: 'Profit & Loss' },
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/admin/hardware', icon: <Settings className="w-5 h-5" />, label: 'Hardware' },
      { path: '/admin/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
      { path: '/admin/flow', icon: <CheckSquare className="w-5 h-5 text-emerald-500" />, label: 'System Flow' },
      { path: '/admin/diagnostics', icon: <Database className="w-5 h-5 text-amber-500" />, label: 'DB Server Test' },
    ]
  }
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeName } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Server-validated session: only ADMIN / MANAGER may use the admin area
    let cancelled = false;
    convex
      .query(api.posAuth.whoami, { token: getToken() })
      .then((me) => {
        if (cancelled) return;
        if (!me || (me.role !== 'ADMIN' && me.role !== 'MANAGER')) {
          navigate('/login');
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/login');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Automatically expand the group that contains the active route
    const newExpanded = { ...expandedGroups };
    let hasChanges = false;
    
    navGroups.forEach(group => {
      const isActiveGroup = group.items.some(item => 
        location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
      );
      if (isActiveGroup && !newExpanded[group.title]) {
        newExpanded[group.title] = true;
        hasChanges = true;
      }
    });

    if (Object.keys(newExpanded).length === 0) {
      newExpanded['Overview'] = true;
      hasChanges = true;
    }

    if (hasChanges) {
      setExpandedGroups(newExpanded);
    }
  }, [location.pathname]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const sidebarContent = (
    <>
      <div className="p-6 md:p-8 border-b border-theme-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif italic text-xl md:text-2xl leading-tight text-theme-ink break-words">{storeName}</h1>
            <p className="text-[10px] uppercase tracking-widest text-theme-accent mt-2">Backoffice</p>
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="lg:hidden p-2 text-theme-ink-dim hover:text-theme-ink">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.title] || false;
          const isActiveGroup = group.items.some(item => 
            location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
          );
          
          return (
            <div key={group.title} className="space-y-1">
              <button 
                onClick={() => toggleGroup(group.title)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActiveGroup
                    ? 'text-theme-accent bg-theme-accent/5'
                    : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
                }`}
              >
                <span className="flex-1 pr-2 leading-relaxed">{group.title}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
              
              {isExpanded && (
                <div className="space-y-1 mb-2">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-[11px] font-medium uppercase tracking-wider ${
                          isActive 
                            ? 'bg-theme-accent/10 text-theme-accent font-semibold' 
                            : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 md:p-6 border-t border-theme-border space-y-2 shrink-0">
        <Link
          to="/kds"
          className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt"
        >
          <Receipt className="w-5 h-5" />
          Kitchen Display
        </Link>
        <Link
          to="/pos"
          className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt"
        >
          <Store className="w-5 h-5" />
          Go to POS
        </Link>
        <button
          onClick={() => {
            convex.mutation(api.posAuth.logout, { token: getToken() }).catch(() => {});
            setToken(null);
            localStorage.removeItem('kungpos_admin');
            localStorage.removeItem('kungpos_staff');
            navigate('/login');
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-xs uppercase tracking-wider text-red-400 hover:bg-red-400/10"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-theme-bg text-theme-ink font-sans overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar — hidden on mobile, shown on lg+; overlay drawer on mobile */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-theme-surface border-r border-theme-border flex flex-col transition-transform duration-300 lg:transition-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-theme-bg p-4 sm:p-6 md:p-10 min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 mb-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-theme-ink-dim hover:text-theme-ink">
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="font-serif italic text-lg text-theme-ink truncate">{storeName}</h1>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
