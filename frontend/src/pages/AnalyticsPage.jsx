import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import AnomalyList from '../components/analytics/AnomalyList';
import TrendChart from '../components/analytics/TrendChart';
import HotspotMap from '../components/analytics/HotspotMap';
import { analyticsService } from '../services/analyticsService';
import SpecializedAnalysis from '../components/analytics/SpecializedAnalysis';
import { AlertTriangle, TrendingUp, MapPin, Layers } from 'lucide-react';

const PARAMETERS = [
  { id: 'LST', label: 'Land Surface Temperature', color: '#EF4444' },
  { id: 'NDVI', label: 'Vegetation Index', color: '#10B981' },
  { id: 'NO2', label: 'Nitrogen Dioxide', color: '#8B5CF6' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6' },
];

export default function AnalyticsPage() {
  const [activeParam, setActiveParam] = useState('LST');
  const [activeTab, setActiveTab] = useState('anomalies');
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState(null);
  const [trends, setTrends] = useState(null);
  const [hotspots, setHotspots] = useState(null);

  useEffect(() => {
    runAnalysis();
  }, [activeParam]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [anomalyRes, trendRes, hotspotRes] = await Promise.all([
        analyticsService.getAnomalies(activeParam),
        analyticsService.getTrends(activeParam),
        analyticsService.getHotspots(activeParam),
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

  const tabs = [
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle, count: anomalies?.anomaly_count },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'hotspots', label: 'Hotspots', icon: MapPin, count: hotspots?.cluster_count },
    { id: 'specialized', label: 'Domain Analysis', icon: Layers },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ML Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Anomaly detection, trend prediction, and hotspot clustering</p>
        </div>

        {/* Parameter Selector */}
        <div className="flex gap-2 flex-wrap">
          {PARAMETERS.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveParam(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeParam === p.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count != null && (
                <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader text="Running ML analysis..." /></div>
        ) : (
          <div>
            {activeTab === 'anomalies' && <AnomalyList data={anomalies} />}
            {activeTab === 'trends' && <TrendChart data={trends} />}
            {activeTab === 'hotspots' && <HotspotMap data={hotspots} />}
            {activeTab === 'specialized' && <SpecializedAnalysis />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
