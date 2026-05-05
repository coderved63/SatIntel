import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, FileText, Database, Info, ChevronDown, TreePine, Trophy, Search, Satellite, Globe, Bot } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { useState, useMemo, useRef, useEffect } from 'react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/action-plan', label: 'Action Plan', icon: FileText },
  { to: '/data-explorer', label: 'Data Explorer', icon: Database },
  { to: '/about', label: 'About', icon: Info },
  { to: '/green-gap', label: 'Green Gap', icon: TreePine },
  { to: '/rankings', label: 'City Rankings', icon: Trophy },
  { to: '/saarthi', label: 'Saarthi', icon: Bot },
];

export default function Sidebar() {
  const { city, cities, changeCity } = useCity();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.filter(c => c.name.toLowerCase().includes(q) || c.key.includes(q));
  }, [cities, search]);

  const handleSelectCity = (c) => {
    changeCity(c.key);
    setOpen(false);
    setSearch('');
  };

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

      <div className="mt-8 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50" ref={dropdownRef}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Select City</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 ml-auto">{cities.length}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Satellite className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="text-sm text-white font-semibold truncate">{city.name}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50">
              <div className="p-2 border-b border-slate-700">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-md">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search Gujarat cities..."
                    className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {filteredCities.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-500 bg-slate-800/90 sticky top-0 backdrop-blur-sm border-b border-slate-700/50">
                      <Satellite className="h-3 w-3 inline mr-1" /> Gujarat Cities
                    </div>
                    {filteredCities.map(c => (
                      <button
                        key={c.key}
                        onClick={() => handleSelectCity(c)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                          c.key === city.key ? 'bg-cyan-600/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <Satellite className="h-3 w-3 text-cyan-500 shrink-0" />
                        <span className="truncate">{c.name}</span>
                        {c.key === city.key && <span className="text-[9px] text-cyan-500 ml-auto shrink-0">active</span>}
                      </button>
                    ))}
                  </>
                )}

                {filteredCities.length === 0 && (
                  <p className="px-3 py-4 text-xs text-slate-500 text-center">No Gujarat city found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Real GEE Data</span>
          <span className="text-[10px] text-slate-500">{city.center[0]} deg, {city.center[1]} deg</span>
        </div>
      </div>
    </aside>
  );
}
