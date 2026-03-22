import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import { Activity } from 'lucide-react';

export default function HealthScore() {
  const { city } = useCity();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/satellite/health-score?city=${city.key}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [city.key]);

  if (!data) return null;

  const score = data.overall_score;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Environmental Health</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Circular score gauge */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
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
            <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
        </div>

        {/* Grade + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold" style={{ color: data.overall_color }}>{data.overall_grade}</span>
            <span className="text-sm text-slate-300">{data.overall_label}</span>
          </div>
          <div className="space-y-1">
            {(data.parameter_scores || []).map(p => (
              <div key={p.parameter} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] text-slate-500 w-16 truncate">{p.parameter}</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.score}%`, backgroundColor: p.color }} />
                </div>
                <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(p.score)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
