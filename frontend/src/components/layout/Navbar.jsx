import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCity } from '../../context/CityContext';
import { Satellite, LogOut, User, ChevronDown, LayoutDashboard, BarChart3, FileText, TreePine, Search, Trophy, Brain, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const F = { fontFamily: "'Space Grotesk', sans-serif" };

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/action-plan', label: 'Action Plan', icon: FileText },
  { to: '/green-gap', label: 'Green Gap', icon: TreePine },
  { to: '/research', label: 'Research', icon: Search },
  { to: '/rankings', label: 'Rankings', icon: Trophy },
  { to: '/models', label: 'Models', icon: Brain },
];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { city, cities, changeCity } = useCity();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [cityOpen, setCityOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 flex justify-center pt-4 px-4" style={{ background: 'transparent' }}>
      {/* Centered floating pill */}
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-full"
        style={{ background: 'var(--bg-nav)', backdropFilter: 'blur(20px)', border: '1px solid var(--bg-nav-border)' }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 pl-2 pr-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Satellite className="h-4 w-4 text-white" />
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm transition-all duration-200`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-card-hover)' : 'transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* City selector */}
        {isAuthenticated && (
          <div className="relative ml-1">
            <button
              onClick={() => setCityOpen(!cityOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:bg-white/[0.04]"
            >
              <span className="text-xs" style={{ color: 'var(--accent)' }}>City:</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${cityOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>
            {cityOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-xl max-h-72 overflow-y-auto min-w-[180px] py-1" style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                {cities.map(c => (
                  <button
                    key={c.key}
                    onClick={() => { changeCity(c.key); setCityOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      color: c.key === city.key ? 'var(--accent)' : 'var(--text-secondary)',
                      background: c.key === city.key ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full transition-all hover:bg-white/[0.06]"
          style={{ color: 'var(--text-muted)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User pill / Sign up */}
        {isAuthenticated ? (
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <User className="h-3.5 w-3.5" />
              <span>{user?.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-full hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Link to="/signup" className="text-sm font-medium px-5 py-2 rounded-full transition-all duration-200 ml-2" style={{ ...F, background: 'var(--accent)', color: 'var(--text-on-accent)' }}>
            Sign up
          </Link>
        )}

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white transition-colors ml-1">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-20 left-4 right-4 rounded-2xl px-5 py-4 space-y-1 z-50" style={{ background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-colors w-full">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
