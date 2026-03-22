import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, FileText, Database, Info, Map, ChevronDown, TreePine, Trophy } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { useState } from 'react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/action-plan', label: 'Action Plan', icon: FileText },
  { to: '/data-explorer', label: 'Data Explorer', icon: Database },
  { to: '/about', label: 'About', icon: Info },
  { to: '/green-gap', label: 'Green Gap', icon: TreePine },
  { to: '/rankings', label: 'City Rankings', icon: Trophy },
];

export default function Sidebar() {
  const { city, cities, changeCity } = useCity();
  const [open, setOpen] = useState(false);

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
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <span className="text-sm text-white font-semibold">{city.name}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
              {cities.map(c => (
                <button
                  key={c.key}
                  onClick={() => { changeCity(c.key); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    c.key === city.key
                      ? 'bg-cyan-600/20 text-cyan-400'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">{city.center[0]}°N, {city.center[1]}°E</p>
      </div>
    </aside>
  );
}
