import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import MapView from '../components/dashboard/MapView';
import StatsCard from '../components/dashboard/StatsCard';
import ChartWidget from '../components/dashboard/ChartWidget';
import LayerControl from '../components/dashboard/LayerControl';
import { satelliteService } from '../services/satelliteService';
import { analyticsService } from '../services/analyticsService';
import { Thermometer, Leaf, Wind, Droplets } from 'lucide-react';
import { useCity } from '../context/CityContext';

export default function DashboardPage() {
  const { city } = useCity();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState(null);
  const [layers, setLayers] = useState([
    { id: 'LST', label: 'Urban Heat Island', color: '#EF4444', enabled: true },
    { id: 'NDVI', label: 'Vegetation Health', color: '#10B981', enabled: true },
    { id: 'NO2', label: 'Air Pollution (NO₂)', color: '#8B5CF6', enabled: false },
    { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6', enabled: false },
  ]);
  const [heatmapData, setHeatmapData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [city.key]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, lstTs, ndviTs, no2Ts, smTs] = await Promise.all([
        analyticsService.getSummary(city.key),
        satelliteService.getTimeSeries('LST', city.key),
        satelliteService.getTimeSeries('NDVI', city.key),
        satelliteService.getTimeSeries('NO2', city.key),
        satelliteService.getTimeSeries('SOIL_MOISTURE', city.key),
      ]);
      setSummary(summaryRes);
      setTimeseries({ LST: lstTs, NDVI: ndviTs, NO2: no2Ts, SOIL_MOISTURE: smTs });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLayerToggle = (layerId) => {
    setLayers(prev =>
      prev.map(l => l.id === layerId ? { ...l, enabled: !l.enabled } : l)
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Loader text="Loading satellite data..." /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <button onClick={loadData} className="text-cyan-400 hover:text-cyan-300 text-sm">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const lstStats = summary?.parameters?.LST?.statistics || {};
  const ndviStats = summary?.parameters?.NDVI?.statistics || {};
  const no2Stats = summary?.parameters?.NO2?.statistics || {};
  const smStats = summary?.parameters?.SOIL_MOISTURE?.statistics || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{city.name} Environmental Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Satellite-based environmental monitoring — MODIS, Sentinel-5P, SMAP</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Avg Temperature"
            value={`${lstStats.mean || '--'}°C`}
            icon={Thermometer}
            color="red"
            subtitle={`Max: ${lstStats.max || '--'}°C`}
            trend={summary?.parameters?.LST?.anomaly_count ? `${summary.parameters.LST.anomaly_count} anomalies` : null}
          />
          <StatsCard
            title="Vegetation Index"
            value={`${ndviStats.mean || '--'} NDVI`}
            icon={Leaf}
            color="emerald"
            subtitle={`Range: ${ndviStats.min || '--'} - ${ndviStats.max || '--'}`}
            trend={summary?.parameters?.NDVI?.hotspot_count ? `${summary.parameters.NDVI.hotspot_count} stress zones` : null}
          />
          <StatsCard
            title="Air Quality (NO₂)"
            value={no2Stats.mean ? `${(no2Stats.mean * 1e6).toFixed(1)} µmol/m²` : '--'}
            icon={Wind}
            color="purple"
            subtitle={no2Stats.max ? `Peak: ${(no2Stats.max * 1e6).toFixed(1)} µmol/m²` : ''}
            trend={summary?.parameters?.NO2?.anomaly_count ? `${summary.parameters.NO2.anomaly_count} anomalies` : null}
          />
          <StatsCard
            title="Soil Moisture"
            value={`${smStats.mean || '--'} m³/m³`}
            icon={Droplets}
            color="blue"
            subtitle={smStats.mean < 0.15 ? 'Below average' : 'Normal range'}
            trend={summary?.parameters?.SOIL_MOISTURE?.hotspot_count ? `${summary.parameters.SOIL_MOISTURE.hotspot_count} dry zones` : null}
          />
        </div>

        {/* Map + Charts */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Map */}
          <div className="lg:col-span-3">
            <Card className="h-[500px] relative" padding="p-0">
              <div className="absolute top-4 right-4 z-[1000]">
                <LayerControl layers={layers} onToggle={handleLayerToggle} />
              </div>
              <MapView layers={layers} city={city} />
            </Card>
          </div>

          {/* Charts + Alerts */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Temperature Trend</h3>
              <ChartWidget
                data={timeseries?.LST?.timeseries || []}
                xKey="date"
                yKey="value"
                color="#EF4444"
                unit="°C"
              />
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Vegetation Health Trend</h3>
              <ChartWidget
                data={timeseries?.NDVI?.timeseries || []}
                xKey="date"
                yKey="value"
                color="#10B981"
                unit="NDVI"
              />
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
