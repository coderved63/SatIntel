import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import { AlertTriangle, AlertCircle, X, Bell } from 'lucide-react';
import api from '../../services/api';

function formatDate(value) {
  if (!value) return 'selected window';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '--';
  const numeric = Number(value);
  return Math.abs(numeric) < 0.01 ? numeric.toExponential(2) : numeric.toFixed(3);
}

export default function AlertBanner() {
  const { city } = useCity();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get(`/satellite/alerts?city=${city.key}`)
      .then(r => { setData(r.data); setDismissed([]); })
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Bell className={`h-4 w-4 shrink-0 ${isCritical ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
          <span className={`text-sm font-medium shrink-0 ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
            {data.summary.critical > 0 && `${data.summary.critical} critical`}
            {data.summary.critical > 0 && data.summary.warning > 0 && ' + '}
            {data.summary.warning > 0 && `${data.summary.warning} warning`}
            {' alert'}{data.total_alerts !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-400 truncate">
            {topAlert.parameter}: {topAlert.message} on {formatDate(topAlert.trigger_date)}
          </span>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{expanded ? 'Collapse' : 'Show all'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 px-4 py-2 space-y-2">
          {visibleAlerts.map((alert, i) => (
            <div key={`${alert.parameter}-${alert.level}-${i}`} className="flex items-start gap-3 py-1.5">
              {alert.level === 'critical'
                ? <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${alert.level === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                  {alert.parameter} - {alert.level.toUpperCase()} warning
                </p>
                <p className="text-xs text-slate-400">{alert.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Trigger: {formatValue(alert.trigger_value)} {alert.unit} on {formatDate(alert.trigger_date)} | Threshold: {alert.threshold} {alert.unit}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Basis: {alert.basis}; samples that date: {alert.sample_count || '--'}; coverage: {alert.data_coverage?.start_date || '--'} to {alert.data_coverage?.end_date || '--'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{alert.justification}</p>
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
