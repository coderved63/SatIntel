import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { Trophy, TrendingUp, TrendingDown, Medal, MapPin } from 'lucide-react';

const CITIES = [
  'ahmedabad', 'surat', 'vadodara', 'rajkot', 'bhavnagar',
  'jamnagar', 'gandhinagar', 'junagadh', 'anand', 'morbi',
  'mehsana', 'bharuch', 'navsari', 'vapi',
];

const gradeColors = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  C: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  D: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  F: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

export default function CityRankingPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      const results = [];
      for (const city of CITIES) {
        try {
          const res = await fetch(`/api/v1/satellite/health-score?city=${city}`);
          const data = await res.json();
          results.push(data);
          setLoaded(results.length);
        } catch {
          results.push({ city, overall_score: 0, overall_grade: '?', overall_label: 'Error', overall_color: '#94A3B8', parameter_scores: [] });
        }
      }
      results.sort((a, b) => b.overall_score - a.overall_score);
      setRankings(results);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const avgScore = rankings.length ? (rankings.reduce((s, r) => s + r.overall_score, 0) / rankings.length).toFixed(1) : '--';
  const best = rankings[0];
  const worst = rankings[rankings.length - 1];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Gujarat City Environmental Rankings</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              14 cities ranked by satellite-derived Environmental Health Score (0-100)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader text={`Scoring cities... ${loaded}/${CITIES.length}`} />
            <div className="mt-4 max-w-xs mx-auto h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary, #1e293b)' }}>
              <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${(loaded / CITIES.length) * 100}%` }} />
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card padding="p-4 text-center">
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Gujarat Average</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{avgScore}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>out of 100</p>
              </Card>
              <Card padding="p-4 text-center" className="border-emerald-500/20">
                <p className="text-xs uppercase tracking-wide mb-1 text-emerald-400">Best City</p>
                <p className="text-xl font-bold text-emerald-400">{best?.city?.charAt(0).toUpperCase() + best?.city?.slice(1)}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{best?.overall_score?.toFixed(1)}/100</p>
              </Card>
              <Card padding="p-4 text-center" className="border-red-500/20">
                <p className="text-xs uppercase tracking-wide mb-1 text-red-400">Needs Attention</p>
                <p className="text-xl font-bold text-red-400">{worst?.city?.charAt(0).toUpperCase() + worst?.city?.slice(1)}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{worst?.overall_score?.toFixed(1)}/100</p>
              </Card>
            </div>

            {/* Ranking Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border, #334155)' }}>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Rank</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>City</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Score</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Grade</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Status</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>LST</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>NDVI</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>NO2</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Soil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => {
                      const grade = gradeColors[r.overall_grade] || gradeColors.C;
                      const params = {};
                      (r.parameter_scores || []).forEach(p => { params[p.parameter] = p; });
                      return (
                        <tr key={r.city} style={{ borderBottom: '1px solid var(--bg-card-border, #1e293b44)' }}
                          className="transition-colors"
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255,255,255,0.02))'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td className="py-3 px-4">
                            {i < 3 ? (
                              <Medal className={`h-5 w-5 ${medalColors[i]}`} />
                            ) : (
                              <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {r.city?.charAt(0).toUpperCase() + r.city?.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary, #1e293b)' }}>
                                <div className="h-full rounded-full" style={{ width: `${r.overall_score}%`, backgroundColor: r.overall_color }} />
                              </div>
                              <span className="font-bold font-mono text-sm" style={{ color: r.overall_color }}>{r.overall_score?.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${grade.bg} ${grade.text}`}>
                              {r.overall_grade}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs" style={{ color: r.overall_color }}>{r.overall_label}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono" style={{ color: params.LST?.color || 'var(--text-muted)' }}>
                              {params.LST?.score?.toFixed(0) || '--'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono" style={{ color: params.NDVI?.color || 'var(--text-muted)' }}>
                              {params.NDVI?.score?.toFixed(0) || '--'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono" style={{ color: params.NO2?.color || 'var(--text-muted)' }}>
                              {params.NO2?.score?.toFixed(0) || '--'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono" style={{ color: params.SOIL_MOISTURE?.color || 'var(--text-muted)' }}>
                              {params.SOIL_MOISTURE?.score?.toFixed(0) || '--'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <p className="text-[10px] text-center font-mono" style={{ color: 'var(--text-faint, var(--text-muted))' }}>
              Scores derived from MODIS LST, MODIS NDVI, Sentinel-5P NO2, NASA SMAP Soil Moisture via Google Earth Engine
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
