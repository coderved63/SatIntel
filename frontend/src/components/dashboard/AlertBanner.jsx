import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import { AlertTriangle, AlertCircle, CheckCircle, X, Bell } from 'lucide-react';

export default function AlertBanner() {
  const { city } = useCity();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/satellite/alerts?city=${city.key}`)
      .then(r => r.json())
      .then(d => { setData(d); setDismissed([]); })
      .catch(() => setData(null));
  }, [city.key]);

  if (!data || data.total_alerts === 0) return null;

  const visibleAlerts = data.alerts.filter(a => !dismissed.includes(a.parameter + a.level));

  if (visibleAlerts.length === 0) return null;

  const topAlert = visibleAlerts[0];
  const isCritical = topAlert.level === 'critical';

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isCritical
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-amber-500/10 border-amber-500/30'
    }`}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-3">
          <Bell className={`h-4 w-4 ${isCritical ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
          <span className={`text-sm font-medium ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
            {data.summary.critical > 0 && `${data.summary.critical} critical`}
            {data.summary.critical > 0 && data.summary.warning > 0 && ' + '}
            {data.summary.warning > 0 && `${data.summary.warning} warning`}
            {' alert'}{data.total_alerts !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-500">{topAlert.message}</span>
        </div>
        <span className="text-xs text-slate-500">{expanded ? 'Collapse' : 'Show all'}</span>
      </button>

      {/* Expanded alerts */}
      {expanded && (
        <div className="border-t border-slate-700/30 px-4 py-2 space-y-2">
          {visibleAlerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5">
              {alert.level === 'critical'
                ? <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${alert.level === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                  {alert.parameter} — {alert.level.toUpperCase()}
                </p>
                <p className="text-xs text-slate-400">{alert.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Current: {alert.current_value} {alert.unit} | Threshold: {alert.threshold} {alert.unit}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(d => [...d, alert.parameter + alert.level]); }}
                className="text-slate-600 hover:text-slate-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
