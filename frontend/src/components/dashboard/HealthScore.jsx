import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import { Activity } from 'lucide-react';
import api from '../../services/api';
import { useAnalysisContext } from '../../context/AnalysisContext';
import { displayWindow } from '../../utils/dateRange';

export default function HealthScore() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get(`/satellite/health-score?city=${city.key}&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
      .then(r => setData(r.data))
      .catch(() => setData(null));
  }, [city.key, dateRange.start_date, dateRange.end_date]);

  if (!data) return null;

  const score = data.overall_score;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300 space-y-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}
    >
      <div className="flex items-center gap-4">
        {/* Circular score — click/hover to expand */}
        <div
          className="relative w-24 h-24 shrink-0 cursor-pointer group"
          onClick={() => setExpanded(!expanded)}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
        >
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-card-border)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={data.overall_color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(score)}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/100</span>
          </div>
          {/* Subtle pulse ring on hover */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-cyan-500/20 transition-all duration-300" />
        </div>

        {/* Label — always visible */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <div>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Environmental Health</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold" style={{ color: data.overall_color }}>{data.overall_grade}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.overall_label}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Score window: {displayWindow(data.analysis_window || dateRange)}
            </p>
          </div>
        </div>

        {/* Expanded details — slides in */}
        <div
          className="flex-1 min-w-0 overflow-hidden transition-all duration-300"
          style={{
            maxWidth: expanded ? '600px' : '0px',
            opacity: expanded ? 1 : 0,
            marginLeft: expanded ? '16px' : '0px',
          }}
        >
          <div className="space-y-1.5 pl-4" style={{ borderLeft: '1px solid var(--bg-card-border)' }}>
            {(data.parameter_scores || []).map(p => (
              <div key={p.parameter} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] w-20 truncate" style={{ color: 'var(--text-muted)' }}>{p.parameter}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: expanded ? `${p.score}%` : '0%', backgroundColor: p.color }}
                  />
                </div>
                <span className="text-[10px] w-6 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{Math.round(p.score)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-card-border)' }}>
          <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            How this score is measured
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.score_formula}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
            {data.methodology}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-card-border)' }}>
          <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            How to read it
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.interpretation_summary}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
            {data.limitations}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {data.parameter_scores?.map(metric => (
          <div
            key={metric.parameter}
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-card-border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{metric.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{metric.metric_label}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: metric.color }}>{Math.round(metric.score)}/100</p>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Weight {Math.round(metric.weight * 100)}%</p>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Mean observed value: {metric.mean_value == null ? 'No valid observations in selected window' : `${metric.mean_value} ${metric.unit || ''}`}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Coverage: {metric.data_coverage?.start_date || '--'} to {metric.data_coverage?.end_date || '--'} | {metric.data_coverage?.timestamp_count || 0} timestamps
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              {metric.how_calculated}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
