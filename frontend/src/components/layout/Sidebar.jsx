import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, FileText, Database, Info, Map } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/action-plan', label: 'Action Plan', icon: FileText },
  { to: '/data-explorer', label: 'Data Explorer', icon: Database },
  { to: '/about', label: 'About', icon: Info },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900/80 border-r border-slate-700/50 min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Active City</span>
        </div>
        <p className="text-sm text-white font-semibold">Ahmedabad</p>
        <p className="text-xs text-slate-500">23.0225°N, 72.5714°E</p>
      </div>
    </aside>
  );
}
