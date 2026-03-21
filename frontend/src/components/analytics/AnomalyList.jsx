import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';

const SEVERITY = {
  critical: { icon: AlertTriangle, color: '#EF4444', label: 'Critical' },
  high: { icon: AlertCircle, color: '#F97316', label: 'High' },
  moderate: { icon: Info, color: '#EAB308', label: 'Moderate' },
};

export default function AnomalyList({ data }) {
  const [activeFilter, setActiveFilter] = useState('all');

  if (!data) return null;
  const { anomalies = [], total_points, anomaly_count, parameter } = data;

  // Count by severity
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, moderate: 0 };
    anomalies.forEach(a => { if (c[a.severity] !== undefined) c[a.severity]++; });
    return c;
  }, [anomalies]);

  const filtered = activeFilter === 'all'
    ? anomalies
    : anomalies.filter(a => a.severity === activeFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Anomaly Detection</h3>
          <p className="text-xs text-white/30 mt-0.5">Isolation Forest &middot; {parameter} &middot; {total_points?.toLocaleString()} data points analyzed</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight" style={{ color: anomaly_count > 100 ? '#EF4444' : '#EAB308' }}>
            {anomaly_count?.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/25 uppercase tracking-wider">anomalies found</p>
        </div>
      </div>

      {/* Severity Filter Pills */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-white/20" />
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-white/10 text-white'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          All ({anomaly_count})
        </button>
        {Object.entries(SEVERITY).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeFilter === key ? `${cfg.color}15` : 'transparent',
              color: activeFilter === key ? cfg.color : 'rgba(255,255,255,0.3)',
              border: activeFilter === key ? `1px solid ${cfg.color}30` : '1px solid transparent',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* Anomaly List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-white/20 text-sm">No anomalies in this category</div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((anomaly, idx) => {
            const cfg = SEVERITY[anomaly.severity] || SEVERITY.moderate;
            const Icon = cfg.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.03]"
                style={{ borderLeft: `3px solid ${cfg.color}30` }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${cfg.color}10` }}>
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>{anomaly.severity}</span>
                    <span className="text-[10px] text-white/15">&middot;</span>
                    <span className="text-[10px] text-white/30 font-mono">{anomaly.lat}, {anomaly.lng}</span>
                  </div>
                  <p className="text-sm text-white/70 mt-0.5">
                    <span className="font-mono font-semibold text-white">{anomaly.value}</span>
                    <span className="text-white/20 mx-1.5">|</span>
                    <span className="text-white/25 text-xs">score: {anomaly.anomaly_score}</span>
                  </p>
                </div>
                <span className="text-xs text-white/20 font-mono shrink-0">{anomaly.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
