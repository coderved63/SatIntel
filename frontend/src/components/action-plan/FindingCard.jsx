import Card from '../common/Card';

const severityColors = {
  critical: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  moderate: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  low: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

const paramColors = {
  LST: '#EF4444',
  NDVI: '#10B981',
  NO2: '#8B5CF6',
  SOIL_MOISTURE: '#3B82F6',
};

export default function FindingCard({ finding }) {
  const severity = severityColors[finding.severity] || severityColors.moderate;

  return (
    <Card className={`${severity.border} border`} padding="p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">{finding.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${severity.text} ${severity.bg}`}>
          {finding.severity}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-3">{finding.description}</p>
      {finding.evidence && (
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-xs text-slate-500">
            <span className="font-medium" style={{ color: paramColors[finding.parameter] }}>Evidence:</span> {finding.evidence}
          </p>
        </div>
      )}
    </Card>
  );
}
