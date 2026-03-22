import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import AnomalyList from '../components/analytics/AnomalyList';
import TrendChart from '../components/analytics/TrendChart';
import HotspotMap from '../components/analytics/HotspotMap';
import { analyticsService } from '../services/analyticsService';
import SpecializedAnalysis from '../components/analytics/SpecializedAnalysis';
import { AlertTriangle, TrendingUp, MapPin, Layers } from 'lucide-react';
import { useCity } from '../context/CityContext';
import ExportButton from '../components/common/ExportButton';
import { exportToCsv } from '../utils/exportCsv';

const PARAMETERS = [
  { id: 'LST', label: 'Temperature', color: '#EF4444' },
  { id: 'NDVI', label: 'Vegetation', color: '#10B981' },
  { id: 'NO2', label: 'NO\u2082', color: '#8B5CF6' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6' },
];

const TABS = [
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'hotspots', label: 'Hotspots', icon: MapPin },
  { id: 'specialized', label: 'Domain Analysis', icon: Layers },
];

export default function AnalyticsPage() {
  const { city } = useCity();
  const [activeParam, setActiveParam] = useState('LST');
  const [activeTab, setActiveTab] = useState('anomalies');
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState(null);
  const [trends, setTrends] = useState(null);
  const [hotspots, setHotspots] = useState(null);

  useEffect(() => {
    runAnalysis();
  }, [activeParam, city.key]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [anomalyRes, trendRes, hotspotRes] = await Promise.all([
        analyticsService.getAnomalies(activeParam, city.key),
        analyticsService.getTrends(activeParam, city.key),
        analyticsService.getHotspots(activeParam, city.key),
      ]);
      setAnomalies(anomalyRes);
      setTrends(trendRes);
      setHotspots(hotspotRes);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

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
              : tab.id === 'hotspots' ? hotspots?.cluster_count : null;
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
            {activeTab === 'anomalies' && (
              <div>
                <div className="flex justify-end mb-3">
                  <ExportButton onClick={() => exportToCsv(anomalies?.anomalies || [], `anomalies_${activeParam}`)} />
                </div>
                <AnomalyList data={anomalies} />
              </div>
            )}
            {activeTab === 'trends' && <TrendChart data={trends} />}
            {activeTab === 'hotspots' && <HotspotMap data={hotspots} />}
            {activeTab === 'specialized' && <SpecializedAnalysis />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
