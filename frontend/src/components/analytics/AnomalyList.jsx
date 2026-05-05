import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';

const SEVERITY = {
  critical: { icon: AlertTriangle, color: '#EF4444', label: 'Critical' },
  high: { icon: AlertCircle, color: '#F97316', label: 'High' },
  moderate: { icon: Info, color: '#EAB308', label: 'Moderate' },
};

function describeAnomaly(parameter, value, severity) {
  const scale = severity === 'critical' ? 'extreme' : severity === 'high' ? 'significant' : 'notable';
  const descriptions = {
    LST: `${scale} surface temperature of ${value}°C - indicates urban heat island stress`,
    NDVI: value < 0.2
      ? `${scale} vegetation decline (NDVI ${value}) - possible deforestation or drought`
      : `${scale} NDVI spike (${value}) - unusual greening event detected`,
    NO2: `${scale} NO2 concentration (${value} mol/m²) - elevated pollution from industrial or traffic sources`,
    SO2: `${scale} SO2 level (${value} mol/m²) - industrial emission spike detected`,
    CO: `${scale} CO level (${value} mol/m²) - combustion or biomass burning indicator`,
    O3: `${scale} ozone column (${value} mol/m²) - atmospheric chemistry anomaly`,
    AEROSOL: `${scale} aerosol index (${value}) - dust storm, haze, or smoke event`,
    SOIL_MOISTURE: value < 0.1
      ? `${scale} soil moisture deficit (${value} m³/m³) - drought risk for agriculture`
      : `${scale} soil saturation (${value} m³/m³) - potential waterlogging or flood risk`,
  };
  return descriptions[parameter] || `${scale} anomaly detected - value ${value} deviates from expected range`;
}

export default function AnomalyList({ data }) {
  const [activeFilter, setActiveFilter] = useState('all');

  if (!data) return null;
  const { anomalies = [], total_points, anomaly_count, parameter } = data;

  const counts = useMemo(() => {
    const summary = { critical: 0, high: 0, moderate: 0 };
    anomalies.forEach(anomaly => {
      if (summary[anomaly.severity] !== undefined) summary[anomaly.severity] += 1;
    });
    return summary;
  }, [anomalies]);

  const filtered = activeFilter === 'all'
    ? anomalies
    : anomalies.filter(anomaly => anomaly.severity === activeFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Anomaly Detection</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
            Isolation Forest &middot; {parameter} &middot; {total_points?.toLocaleString()} data points analyzed
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
            Date range: {data.date_range?.start || '--'} to {data.date_range?.end || '--'} &middot; baseline mean {data.baseline_mean ?? '--'} &middot; std {data.baseline_std ?? '--'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight" style={{ color: anomaly_count > 100 ? '#EF4444' : '#EAB308' }}>
            {anomaly_count?.toLocaleString()}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>anomalies found</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5" style={{ color: 'var(--text-faint)' }} />
        <button
          onClick={() => setActiveFilter('all')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: activeFilter === 'all' ? 'var(--bg-badge)' : 'transparent',
            color: activeFilter === 'all' ? 'var(--text-primary)' : 'var(--text-faint)',
          }}
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
              color: activeFilter === key ? cfg.color : 'var(--text-faint)',
              border: activeFilter === key ? `1px solid ${cfg.color}30` : '1px solid transparent',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label} ({counts[key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-faint)' }}>No anomalies in this category</div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((anomaly, idx) => {
            const cfg = SEVERITY[anomaly.severity] || SEVERITY.moderate;
            const Icon = cfg.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ borderLeft: `3px solid ${cfg.color}30` }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${cfg.color}10` }}>
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>{anomaly.severity}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>&middot;</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{anomaly.lat}, {anomaly.lng}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {anomaly.description || describeAnomaly(parameter, anomaly.value, anomaly.severity)}
                  </p>
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>
                    val: {anomaly.value} &middot; score: {anomaly.anomaly_score}
                    {anomaly.deviation ? ` · ${anomaly.deviation}σ ${anomaly.direction || ''}` : ''}
                  </p>
                </div>
                <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>{anomaly.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
