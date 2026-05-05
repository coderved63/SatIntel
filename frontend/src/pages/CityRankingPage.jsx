import { useEffect, useState } from 'react';
import { Trophy, Medal, Info } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import EvidenceContextPanel from '../components/common/EvidenceContextPanel';
import api from '../services/api';
import { useAnalysisContext } from '../context/AnalysisContext';

const CITIES = [
  'ahmedabad', 'surat', 'vadodara', 'rajkot', 'bhavnagar',
  'jamnagar', 'gandhinagar', 'junagadh', 'anand', 'morbi',
  'mehsana', 'bharuch', 'navsari', 'vapi',
];

const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

export default function CityRankingPage() {
  const { dateRange } = useAnalysisContext();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setLoaded(0);
      const results = [];
      for (const city of CITIES) {
        try {
          const { data } = await api.get('/satellite/health-score', { params: { city, start_date: dateRange.start_date, end_date: dateRange.end_date } });
          results.push(data);
          setLoaded(results.length);
        } catch {
          results.push({ city, overall_score: 0, overall_grade: '?', overall_label: 'Unavailable', overall_color: '#94A3B8', parameter_scores: [] });
        }
      }
      results.sort((a, b) => b.overall_score - a.overall_score);
      setRankings(results);
      setLoading(false);
    };
    fetchAll();
  }, [dateRange.start_date, dateRange.end_date]);

  const avgScore = rankings.length ? (rankings.reduce((sum, row) => sum + row.overall_score, 0) / rankings.length).toFixed(1) : '--';
  const best = rankings[0];
  const worst = rankings[rankings.length - 1];
  const rankingEvidence = rankings[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Gujarat City Environmental Rankings</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Cross-city comparison using the same analysis window and the same weighted scoring method
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader text={`Scoring cities... ${loaded}/${CITIES.length}`} />
          </div>
        ) : (
          <>
            <EvidenceContextPanel title="Ranking Methodology" evidence={rankingEvidence} compact />

            <Card>
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-cyan-400 mt-0.5" />
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <p>{rankingEvidence?.score_formula}</p>
                  <p>Each parameter score is normalized to 0-100 against explicit threshold bands, then weighted into one composite score.</p>
                  <p>These rankings are robust for screening cities against the same metric definition, but they are not a substitute for page-level diagnosis.</p>
                </div>
              </div>
            </Card>

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

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Rank</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>City</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Score</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Interpretation</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>LST</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>NDVI</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>NO2</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Soil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row, index) => {
                      const params = {};
                      (row.parameter_scores || []).forEach(param => { params[param.parameter] = param; });
                      return (
                        <tr key={row.city} style={{ borderBottom: '1px solid var(--bg-card-border)' }}>
                          <td className="py-3 px-4">
                            {index < 3 ? <Medal className={`h-5 w-5 ${medalColors[index]}`} /> : <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>}
                          </td>
                          <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.city?.charAt(0).toUpperCase() + row.city?.slice(1)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold font-mono text-sm" style={{ color: row.overall_color }}>{row.overall_score?.toFixed(1)}</span>
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: row.overall_color }}>{row.overall_label}</td>
                          <td className="py-3 px-4 text-xs font-mono" style={{ color: params.LST?.color || 'var(--text-muted)' }}>{params.LST?.score?.toFixed(0) || '--'}</td>
                          <td className="py-3 px-4 text-xs font-mono" style={{ color: params.NDVI?.color || 'var(--text-muted)' }}>{params.NDVI?.score?.toFixed(0) || '--'}</td>
                          <td className="py-3 px-4 text-xs font-mono" style={{ color: params.NO2?.color || 'var(--text-muted)' }}>{params.NO2?.score?.toFixed(0) || '--'}</td>
                          <td className="py-3 px-4 text-xs font-mono" style={{ color: params.SOIL_MOISTURE?.color || 'var(--text-muted)' }}>{params.SOIL_MOISTURE?.score?.toFixed(0) || '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
