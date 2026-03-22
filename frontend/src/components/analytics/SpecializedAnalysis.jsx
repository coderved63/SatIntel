import { useState, useEffect } from 'react';
import Loader from '../common/Loader';
import { analysisService } from '../../services/analysisService';
import { Leaf, Building2, Wheat, Thermometer, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
    </div>
  );
}

function AnalysisSection({ title, icon: Icon, color, metrics, insights }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {metrics.map((m, i) => (
          <MetricCard key={i} label={m.label} value={m.value} color={m.color || 'var(--text-primary)'} sub={m.sub} />
        ))}
      </div>
      {insights && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--bg-card-border)' }}>
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: insight.color || 'var(--text-faint)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{insight.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpecializedAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await analysisService.getFullReport();
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="py-16"><Loader text="Running specialized analyses..." /></div>;
  if (error) return <p className="text-red-400 text-sm py-8">{error}</p>;
  if (!data) return null;

  const veg = data.vegetation || {};
  const land = data.land_conversion || {};
  const farm = data.farmland || {};
  const heat = data.heat || {};

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <AnalysisSection
        title="Vegetation Loss"
        icon={Leaf}
        color="#10B981"
        metrics={[
          { label: 'NDVI Decline', value: `${veg.ndvi_decline_pct || 0}%`, color: veg.ndvi_decline_pct > 0 ? '#EF4444' : '#10B981' },
          { label: 'Area Lost', value: `${veg.area_lost_sqkm || 0} km\u00B2`, color: '#F59E0B' },
          { label: 'Current NDVI', value: veg.current_city_ndvi || '--', color: '#10B981' },
        ]}
        insights={[
          { text: `${veg.critical_zones || 0} critical zones identified`, color: '#EF4444' },
          { text: `${veg.anomaly_count || 0} anomalies detected`, color: '#F59E0B' },
          { text: `${(veg.clusters || []).length} spatial clusters`, color: '#3B82F6' },
        ]}
      />

      <AnalysisSection
        title="Land Conversion"
        icon={Building2}
        color="#94A3B8"
        metrics={[
          { label: 'Cells Changed', value: land.total_cells_changed || 0, color: '#F59E0B' },
          { label: 'Area Changed', value: `${land.total_area_sqkm || 0} km\u00B2`, color: '#EF4444' },
          { label: 'Rapid Conv.', value: land.rapid_conversions || 0, color: '#EF4444' },
        ]}
        insights={
          land.conversion_breakdown
            ? Object.entries(land.conversion_breakdown).slice(0, 4).map(([key, count]) => ({
                text: `${key.replace(/_/g, ' ')}: ${count}`,
                color: '#94A3B8',
              }))
            : []
        }
      />

      <AnalysisSection
        title="Farmland Analysis"
        icon={Wheat}
        color="#EAB308"
        metrics={[
          { label: 'Zones Analyzed', value: farm.total_zones_analyzed || 0, color: '#3B82F6' },
          { label: 'Suspicious', value: farm.total_suspicious_zones || 0, color: '#EF4444' },
          { label: 'Susp. Area', value: `${farm.total_suspicious_area_sqkm || 0} km\u00B2`, color: '#F97316' },
        ]}
        insights={[
          { text: `Active farmland: ${farm.classifications?.active_farmland || 0}`, color: '#10B981' },
          { text: `Idle land: ${farm.classifications?.idle_land || 0}`, color: '#EAB308' },
          { text: `Barren/converted: ${farm.classifications?.barren_or_converted || 0}`, color: '#EF4444' },
        ]}
      />

      <AnalysisSection
        title="Urban Heat Island"
        icon={Thermometer}
        color="#EF4444"
        metrics={[
          { label: 'UHI Intensity', value: `${heat.uhi_intensity_celsius || 0}°C`, color: '#EF4444' },
          { label: 'Peak Temp', value: `${heat.peak_temp || '--'}°C`, color: '#F97316' },
          { label: 'City Average', value: `${heat.city_avg_temp || '--'}°C`, color: '#EAB308' },
        ]}
        insights={[
          { text: `Urban core: ${heat.urban_avg || '--'}°C | Fringe: ${heat.fringe_avg || '--'}°C`, color: '#F97316' },
          { text: `${heat.anomaly_count || 0} heat anomalies`, color: '#EF4444' },
          { text: `${heat.hotspot_count || 0} hotspot clusters`, color: '#EAB308' },
          ...(heat.zone_rankings || []).slice(0, 2).map(z => ({
            text: `${z.zone}: ${z.avg_temp}°C`,
            color: z.avg_temp > 35 ? '#EF4444' : '#94A3B8',
          })),
        ]}
      />
    </div>
  );
}
