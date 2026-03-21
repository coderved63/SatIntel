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
import { Thermometer, Leaf, Wind, Droplets, ChevronDown, Cloud, Flame, Sun, Haze } from 'lucide-react';
import { useCity } from '../context/CityContext';

const AQ_PARAMS = [
  { id: 'NO2', label: 'NO₂', unit: 'mol/m²', scale: 1e6, displayUnit: 'µmol/m²', color: '#8B5CF6', icon: Wind },
  { id: 'SO2', label: 'SO₂', unit: 'mol/m²', scale: 1e6, displayUnit: 'µmol/m²', color: '#F59E0B', icon: Cloud },
  { id: 'CO', label: 'CO', unit: 'mol/m²', scale: 1e2, displayUnit: '×10⁻² mol/m²', color: '#DC2626', icon: Flame },
  { id: 'O3', label: 'O₃', unit: 'mol/m²', scale: 1e3, displayUnit: 'mmol/m²', color: '#2563EB', icon: Sun },
  { id: 'AEROSOL', label: 'Aerosol', unit: 'index', scale: 1, displayUnit: 'index', color: '#92400E', icon: Haze },
];

export default function DashboardPage() {
  const { city } = useCity();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState(null);
  const [aqParam, setAqParam] = useState(AQ_PARAMS[0]);
  const [aqDropdownOpen, setAqDropdownOpen] = useState(false);
  const [aqTimeseries, setAqTimeseries] = useState({});
  const [layers, setLayers] = useState([
    { id: 'LST', label: 'Temperature (LST)', color: '#EF4444', enabled: true },
    { id: 'NDVI', label: 'Vegetation (NDVI)', color: '#10B981', enabled: true },
    { id: 'NO2', label: 'NO₂', color: '#8B5CF6', enabled: false },
    { id: 'SO2', label: 'SO₂', color: '#F59E0B', enabled: false },
    { id: 'CO', label: 'CO', color: '#DC2626', enabled: false },
    { id: 'O3', label: 'O₃', color: '#2563EB', enabled: false },
    { id: 'AEROSOL', label: 'Aerosol Index', color: '#92400E', enabled: false },
    { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6', enabled: false },
  ]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [city.key]);

  // Load AQ timeseries when param changes
  useEffect(() => {
    if (!aqTimeseries[aqParam.id]) {
      satelliteService.getTimeSeries(aqParam.id, city.key).then(data => {
        setAqTimeseries(prev => ({ ...prev, [aqParam.id]: data }));
      }).catch(() => {});
    }
  }, [aqParam.id, city.key]);

  const loadData = async () => {
    try {
      setLoading(true);
      setAqTimeseries({});
      const [summaryRes, lstTs, ndviTs, smTs, no2Ts] = await Promise.all([
        analyticsService.getSummary(city.key),
        satelliteService.getTimeSeries('LST', city.key),
        satelliteService.getTimeSeries('NDVI', city.key),
        satelliteService.getTimeSeries('SOIL_MOISTURE', city.key),
        satelliteService.getTimeSeries('NO2', city.key),
      ]);
      setSummary(summaryRes);
      setTimeseries({ LST: lstTs, NDVI: ndviTs, SOIL_MOISTURE: smTs });
      setAqTimeseries({ NO2: no2Ts });
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

  // Air quality display values
  const aqStats = summary?.parameters?.[aqParam.id]?.statistics || no2Stats;
  const aqMean = aqStats.mean != null ? (aqStats.mean * aqParam.scale).toFixed(2) : '--';
  const aqMax = aqStats.max != null ? (aqStats.max * aqParam.scale).toFixed(2) : '--';
  const aqAnomalies = summary?.parameters?.[aqParam.id]?.anomaly_count || summary?.parameters?.NO2?.anomaly_count || 0;

  const AqIcon = aqParam.icon;

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

          {/* Air Quality Dropdown Card */}
          <Card padding="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="relative">
                  <button
                    onClick={() => setAqDropdownOpen(!aqDropdownOpen)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                  >
                    Air Quality ({aqParam.label})
                    <ChevronDown className={`h-3 w-3 transition-transform ${aqDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {aqDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-[160px]">
                      {AQ_PARAMS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setAqParam(p); setAqDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                            p.id === aqParam.id ? 'bg-cyan-600/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-white mt-1">{aqMean} {aqParam.displayUnit}</p>
                <p className="text-xs text-slate-500 mt-1">Peak: {aqMax} {aqParam.displayUnit}</p>
                {aqAnomalies > 0 && <p className="text-xs text-amber-400 mt-1">{aqAnomalies} anomalies</p>}
              </div>
              <div className={`p-2 rounded-lg bg-purple-500/10`}>
                <AqIcon className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </Card>

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

          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Temperature Trend</h3>
              <ChartWidget
                data={timeseries?.LST?.timeseries || []}
                xKey="date" yKey="value" color="#EF4444" unit="°C"
              />
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Vegetation Health Trend</h3>
              <ChartWidget
                data={timeseries?.NDVI?.timeseries || []}
                xKey="date" yKey="value" color="#10B981" unit="NDVI"
              />
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">{aqParam.label} Trend</h3>
              <ChartWidget
                data={aqTimeseries[aqParam.id]?.timeseries || []}
                xKey="date" yKey="value" color={aqParam.color} unit={aqParam.unit}
              />
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
