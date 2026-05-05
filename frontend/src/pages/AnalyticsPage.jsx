import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import AnomalyList from '../components/analytics/AnomalyList';
import HotspotMap from '../components/analytics/HotspotMap';
import { analyticsService } from '../services/analyticsService';
import SpecializedAnalysis from '../components/analytics/SpecializedAnalysis';
import { AlertTriangle, MapPin, Layers, LineChart } from 'lucide-react';
import DashboardForecastChart from '../components/dashboard/DashboardForecastChart';
import { useCity } from '../context/CityContext';
import { useAnalysisContext } from '../context/AnalysisContext';
import ExportButton from '../components/common/ExportButton';
import { exportToCsv } from '../utils/exportCsv';
import EvidenceContextPanel from '../components/common/EvidenceContextPanel';

const PARAMETERS = [
  { id: 'LST', label: 'Temperature', color: '#EF4444' },
  { id: 'NDVI', label: 'Vegetation', color: '#10B981' },
  { id: 'NO2', label: 'NO\u2082', color: '#8B5CF6' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6' },
];

const TABS = [
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'trends', label: 'Forecast path', icon: LineChart },
  { id: 'hotspots', label: 'Hotspots', icon: MapPin },
  { id: 'specialized', label: 'Domain Analysis', icon: Layers },
];

function AnalyticsContext({ activeTab, activeParam, anomalies, trends, hotspots }) {
  const paramLabel = PARAMETERS.find(p => p.id === activeParam)?.label || activeParam;

  if (activeTab === 'anomalies' && anomalies) {
    return (
      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>How to read this anomaly view</h3>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Scope</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {paramLabel} aggregated at city level across {anomalies.dates_analyzed || 0} dates from {anomalies.date_range?.start || '--'} to {anomalies.date_range?.end || '--'}.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Method</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {anomalies.methodology || 'Isolation Forest on city-level date averages'} with baseline mean {anomalies.baseline_mean ?? '--'} and std {anomalies.baseline_std ?? '--'}.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Interpretation</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {anomalies.interpretation || 'Dates are flagged when the city deviates materially from its usual historical range.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (activeTab === 'trends' && trends) {
    return (
      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reading the timeline</h3>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Active window</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {trends.historical_points || Object.keys(trends.historical || {}).length} city-mean points from {trends.date_range?.start || '--'} to {trends.date_range?.end || '--'}, plus up to {trends.forecast_days || 30} continuation steps on the same axis.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Interpretation</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {trends.interpretation || 'The dashed segment extends the observed city mean as a directional path for screening — not calibrated point forecasts.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (activeTab === 'hotspots' && hotspots) {
    return (
      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>What hotspot clustering means here</h3>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Spatial basis</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Recent averaged grid cells for {paramLabel}, thresholded at {hotspots.threshold ?? '--'} using years {hotspots.date_basis?.start_year || '--'} to {hotspots.date_basis?.end_year || '--'}.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Method</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {hotspots.methodology || 'DBSCAN on recent grid-cell averages'}; {hotspots.hot_points || 0} extreme cells were eligible and {hotspots.cluster_count || 0} spatial clusters survived density filtering.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)' }}>Interpretation</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {hotspots.interpretation || 'A single cluster means extreme values are spatially concentrated, not that only one bad spot exists in the city.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}

export default function AnalyticsPage() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const [activeParam, setActiveParam] = useState('LST');
  const [activeTab, setActiveTab] = useState('anomalies');
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [trends, setTrends] = useState(null);

  useEffect(() => {
    runAnalysis();
  }, [activeParam, city.key, dateRange.start_date, dateRange.end_date]);

  useEffect(() => {
    if (activeTab !== 'trends') return;
    setTrends(null);
    analyticsService.getTrends(activeParam, city.key, dateRange)
      .then(setTrends)
      .catch(() => setTrends(null));
  }, [activeTab, activeParam, city.key, dateRange.start_date, dateRange.end_date]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [anomalyRes, hotspotRes] = await Promise.all([
        analyticsService.getAnomalies(activeParam, city.key, dateRange),
        analyticsService.getHotspots(activeParam, city.key, dateRange),
      ]);
      setAnomalies(anomalyRes);
      setHotspots(hotspotRes);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const paramMeta = PARAMETERS.find(p => p.id === activeParam);
  const paramLabel = paramMeta?.label || activeParam;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Parameter Selector inline */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ML Analytics</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Anomaly detection, trend prediction, and hotspot clustering</p>
          </div>
          <div className="flex gap-1.5">
            {PARAMETERS.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveParam(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeParam === p.id ? `${p.color}15` : 'transparent',
                  color: activeParam === p.id ? p.color : 'var(--text-faint)',
                  border: activeParam === p.id ? `1px solid ${p.color}30` : '1px solid transparent',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '3px', border: '1px solid var(--bg-card-border)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'anomalies' ? anomalies?.anomaly_count
              : tab.id === 'hotspots' ? hotspots?.cluster_count : null; // no count badge on forecast tab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all flex-1 justify-center"
                style={{
                  background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-faint)',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count != null && count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                    background: 'rgba(6,182,212,0.15)',
                    color: 'rgba(6,182,212,0.8)',
                  }}>
                    {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader text="Running ML analysis..." /></div>
        ) : (
          <div>
            <EvidenceContextPanel
              title="Analytics Evidence Context"
              evidence={activeTab === 'anomalies' ? anomalies : activeTab === 'trends' ? trends : hotspots}
              compact
            />
            <AnalyticsContext
              activeTab={activeTab}
              activeParam={activeParam}
              anomalies={anomalies}
              trends={trends}
              hotspots={hotspots}
            />
            {activeTab === 'anomalies' && (
              <div>
                <div className="flex justify-end mb-3">
                  <ExportButton onClick={() => exportToCsv(anomalies?.anomalies || [], `anomalies_${activeParam}`)} />
                </div>
                <AnomalyList data={anomalies} />
              </div>
            )}
            {activeTab === 'trends' && (
              <Card>
                <DashboardForecastChart
                  data={trends}
                  label={`${paramLabel} — city mean & continuation`}
                  histColor={PARAMETERS.find(p => p.id === activeParam)?.color || '#3B82F6'}
                  unit={activeParam === 'NDVI' ? 'NDVI' : activeParam === 'LST' ? 'deg C' : activeParam === 'SOIL_MOISTURE' ? 'm3/m3' : 'units'}
                  height={320}
                />
              </Card>
            )}
            {activeTab === 'hotspots' && <HotspotMap data={hotspots} />}
            {activeTab === 'specialized' && <SpecializedAnalysis />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
