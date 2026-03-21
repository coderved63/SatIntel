const COLOR_MAP = {
  red: { text: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  emerald: { text: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  purple: { text: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  blue: { text: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  cyan: { text: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
  amber: { text: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'cyan', subtitle, trend }) {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-white/25 mt-1">{subtitle}</p>}
          {trend && <p className="text-xs mt-1.5 font-medium" style={{ color: c.text }}>{trend}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
            <Icon className="h-4.5 w-4.5" style={{ color: c.text }} />
          </div>
        )}
      </div>
    </div>
  );
}
