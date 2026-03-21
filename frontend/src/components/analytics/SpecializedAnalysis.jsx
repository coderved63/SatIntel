import { useState, useEffect } from 'react';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { analysisService } from '../../services/analysisService';
import { Leaf, Building2, Wheat, Thermometer, AlertTriangle, TrendingDown, MapPin } from 'lucide-react';

function StatRow({ label, value, color = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function AnalysisCard({ title, icon: Icon, iconColor, loading, error, children }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{title}</h3>
      </div>
      {loading && <div className="py-8"><Loader size="sm" text="Analyzing..." /></div>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && children}
    </Card>
  );
}

export default function SpecializedAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const result = await analysisService.getFullReport();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-16"><Loader text="Running 4 specialized analyses..." /></div>;
  if (error) return <Card><p className="text-red-400">{error}</p></Card>;
  if (!data) return null;

  const veg = data.vegetation || {};
  const land = data.land_conversion || {};
  const farm = data.farmland || {};
  const heat = data.heat || {};
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Vegetation */}
        <AnalysisCard title="Vegetation Loss" icon={Leaf} iconColor="text-emerald-400" loading={false}>
          <StatRow label="NDVI Decline" value={`${veg.ndvi_decline_pct || 0}%`} color={veg.ndvi_decline_pct > 0 ? 'text-red-400' : 'text-emerald-400'} />
          <StatRow label="Area Lost" value={`${veg.area_lost_sqkm || 0} km²`} />
          <StatRow label="Current City NDVI" value={veg.current_city_ndvi || '--'} />
          <StatRow label="Critical Zones" value={veg.critical_zones || 0} color="text-amber-400" />
          <StatRow label="Anomalies" value={veg.anomaly_count || 0} />
          <StatRow label="Clusters" value={(veg.clusters || []).length} />
          {veg.forecast_6m?.length > 0 && (
            <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-400">
              LSTM Forecast: {veg.forecast_6m[0]?.predicted_value?.toFixed(3)} → {veg.forecast_6m[veg.forecast_6m.length - 1]?.predicted_value?.toFixed(3)}
            </div>
          )}
        </AnalysisCard>

        {/* Land Conversion */}
        <AnalysisCard title="Land Conversion" icon={Building2} iconColor="text-slate-400" loading={false}>
          <StatRow label="Cells Changed" value={land.total_cells_changed || 0} />
          <StatRow label="Area Changed" value={`${land.total_area_sqkm || 0} km²`} />
          <StatRow label="Rapid Conversions" value={land.rapid_conversions || 0} color="text-red-400" />
          <StatRow label="Clusters" value={land.cluster_count || 0} />
          {land.conversion_breakdown && Object.entries(land.conversion_breakdown).map(([key, count]) => (
            <StatRow key={key} label={key.replace(/_/g, ' ')} value={count} color="text-slate-300" />
          ))}
        </AnalysisCard>

        {/* Farmland */}
        <AnalysisCard title="Farmland Analysis" icon={Wheat} iconColor="text-amber-400" loading={false}>
          <StatRow label="Zones Analyzed" value={farm.total_zones_analyzed || 0} />
          <StatRow label="Suspicious Zones" value={farm.total_suspicious_zones || 0} color="text-red-400" />
          <StatRow label="Suspicious Area" value={`${farm.total_suspicious_area_sqkm || 0} km²`} />
          {farm.classifications && (
            <>
              <StatRow label="Active Farmland" value={farm.classifications.active_farmland || 0} color="text-emerald-400" />
              <StatRow label="Idle Land" value={farm.classifications.idle_land || 0} color="text-amber-400" />
              <StatRow label="Barren/Converted" value={farm.classifications.barren_or_converted || 0} color="text-red-400" />
            </>
          )}
        </AnalysisCard>

        {/* Heat */}
        <AnalysisCard title="Urban Heat Island" icon={Thermometer} iconColor="text-red-400" loading={false}>
          <StatRow label="UHI Intensity" value={`${heat.uhi_intensity_celsius || 0}°C`} color="text-red-400" />
          <StatRow label="Peak Temperature" value={`${heat.peak_temp || '--'}°C`} />
          <StatRow label="City Average" value={`${heat.city_avg_temp || '--'}°C`} />
          <StatRow label="Urban Core Avg" value={`${heat.urban_avg || '--'}°C`} color="text-orange-400" />
          <StatRow label="Fringe Avg" value={`${heat.fringe_avg || '--'}°C`} color="text-blue-400" />
          <StatRow label="Heat Anomalies" value={heat.anomaly_count || 0} />
          <StatRow label="Hotspot Clusters" value={heat.hotspot_count || 0} />
          {(heat.zone_rankings || []).slice(0, 3).map((z, i) => (
            <StatRow key={i} label={z.zone} value={`${z.avg_temp}°C`} color={z.avg_temp > 35 ? 'text-red-400' : 'text-slate-300'} />
          ))}
        </AnalysisCard>

      </div>
    </div>
  );
}
