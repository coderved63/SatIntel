import Card from '../common/Card';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  moderate: { icon: Info, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

export default function AnomalyList({ data }) {
  if (!data) return null;

  const { anomalies = [], total_points, anomaly_count, parameter } = data;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Anomaly Detection Results</h3>
            <p className="text-sm text-slate-400">Isolation Forest — {parameter}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">{anomaly_count}</p>
            <p className="text-xs text-slate-500">of {total_points} points</p>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No anomalies detected</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {anomalies.map((anomaly, idx) => {
              const config = severityConfig[anomaly.severity] || severityConfig.moderate;
              const Icon = config.icon;
              return (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
                  <Icon className={`h-5 w-5 ${config.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${config.color} capitalize`}>{anomaly.severity}</span>
                      <span className="text-xs text-slate-500">{anomaly.date}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-0.5">
                      Value: <span className="font-mono font-medium text-white">{anomaly.value}</span> at ({anomaly.lat}, {anomaly.lng})
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Score: {anomaly.anomaly_score}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
