import Card from '../common/Card';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

const severityColors = {
  critical: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL' },
  high: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'HIGH' },
  moderate: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'MODERATE' },
  low: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'LOW' },
};

const paramConfig = {
  LST: { color: '#EF4444', label: 'Land Surface Temperature' },
  NDVI: { color: '#10B981', label: 'Vegetation Index' },
  NO2: { color: '#8B5CF6', label: 'Air Quality (NO\u2082)' },
  SOIL_MOISTURE: { color: '#3B82F6', label: 'Soil Moisture' },
};

export default function FindingCard({ finding }) {
  const severity = severityColors[finding.severity] || severityColors.moderate;
  const param = paramConfig[finding.parameter] || { color: '#94A3B8', label: finding.parameter };

  return (
    <Card className={`${severity.border} border`} padding="p-0 overflow-hidden">
      {/* Header bar */}
      <div className={`px-4 py-2 ${severity.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{finding.id || ''}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${param.color}15`, color: param.color }}>
            {param.label}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${severity.text} ${severity.bg}`}>
          {severity.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{finding.title}</h3>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>{finding.description}</p>

        {/* Evidence box */}
        {finding.evidence && (
          <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-card-border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Satellite Evidence: </span>
              {finding.evidence}
            </p>
          </div>
        )}

        {/* Affected population + Trend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {finding.affected_population && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {finding.affected_population}
            </span>
          )}
          {finding.trend && (
            <span className="flex items-center gap-1">
              {finding.trend.toLowerCase().includes('increasing') || finding.trend.toLowerCase().includes('declining')
                ? <TrendingUp className="h-3 w-3 text-red-400" />
                : <TrendingDown className="h-3 w-3 text-emerald-400" />
              }
              <span style={{ color: 'var(--text-muted)' }}>{finding.trend}</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
