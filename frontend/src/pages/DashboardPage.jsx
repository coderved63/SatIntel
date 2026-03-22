import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import MapView from '../components/dashboard/MapView';
import StatsCard from '../components/dashboard/StatsCard';
import DrilldownChart from '../components/dashboard/DrilldownChart';
import LayerControl from '../components/dashboard/LayerControl';
import HealthScore from '../components/dashboard/HealthScore';
import AlertBanner from '../components/dashboard/AlertBanner';
import { satelliteService } from '../services/satelliteService';
import { analyticsService } from '../services/analyticsService';
import { Thermometer, Leaf, Wind, Droplets, ChevronDown, Cloud, Flame, Sun, Haze } from 'lucide-react';
import { useCity } from '../context/CityContext';

function SyncBadge() {
  const [syncInfo, setSyncInfo] = useState(null);
  useEffect(() => {
    fetch('/api/v1/satellite/last-synced')
      .then(r => r.json())
      .then(setSyncInfo)
      .catch(() => {});
  }, []);

  const ts = syncInfo?.last_synced;
  const display = ts ? new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Syncing...';
  const cacheBackend = syncInfo?.cache?.backend || 'memory';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Last synced: <span className="text-emerald-400">{display}</span>
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
          Cache: {cacheBackend === 'redis' ? 'Redis' : 'In-memory'} &middot; Auto-refresh: nightly
        </span>
      </div>
    </div>
  );
}

const AQ_PARAMS = [
  { id: 'NO2', label: 'NO₂', unit: 'mol/m²', scale: 1e6, displayUnit: 'µmol/m²', color: '#8B5CF6', icon: Wind },
  { id: 'SO2', label: 'SO₂', unit: 'mol/m²', scale: 1e6, displayUnit: 'µmol/m²', color: '#F59E0B', icon: Cloud },
  { id: 'CO', label: 'CO', unit: 'mol/m²', scale: 1e2, displayUnit: '×10⁻² mol/m²', color: '#DC2626', icon: Flame },
  { id: 'O3', label: 'O₃', unit: 'mol/m²', scale: 1e3, displayUnit: 'mmol/m²', color: '#2563EB', icon: Sun },
  { id: 'AEROSOL', label: 'Aerosol', unit: 'index', scale: 1, displayUnit: 'index', color: '#92400E', icon: Haze },
];

// Skeleton placeholder for loading state
function SkeletonCard() {
  return (
    <Card padding="p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="text-[10px] text-cyan-400/70 font-medium tracking-wide">ML PIPELINE RUNNING</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-32 rounded" style={{ background: 'var(--skeleton)' }} />
          <div className="h-3 w-20 rounded" style={{ background: 'var(--skeleton)' }} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="animate-pulse h-3 w-32 rounded" style={{ background: 'var(--skeleton)' }} />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
            </span>
            <span className="text-[10px] text-cyan-400/60 font-medium">PROCESSING</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-[180px] pt-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t animate-pulse"
              style={{ background: 'var(--skeleton)' }}
              style={{ height: `${30 + Math.sin(i * 0.5) * 30 + 20}%`, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { city } = useCity();
  const [summary, setSummary] = useState(null);
  const [lstTs, setLstTs] = useState(null);
  const [ndviTs, setNdviTs] = useState(null);
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

  // Progressive loading — each request fires independently
  useEffect(() => {
    // Reset everything on city change
    setSummary(null);
    setLstTs(null);
    setNdviTs(null);
    setAqTimeseries({});
    setError(null);

    // Fire all requests independently — each updates UI as it arrives
    satelliteService.getTimeSeries('LST', city.key)
      .then(data => setLstTs(data))
      .catch(() => {});

    satelliteService.getTimeSeries('NDVI', city.key)
      .then(data => setNdviTs(data))
      .catch(() => {});

    satelliteService.getTimeSeries('NO2', city.key)
      .then(data => setAqTimeseries(prev => ({ ...prev, NO2: data })))
      .catch(() => {});

    // Summary is the heaviest (runs ML) — load last, UI already visible
    analyticsService.getSummary(city.key)
      .then(data => setSummary(data))
      .catch(err => setError(err.message));
  }, [city.key]);

  // Load AQ timeseries when dropdown param changes
  useEffect(() => {
    if (!aqTimeseries[aqParam.id]) {
      satelliteService.getTimeSeries(aqParam.id, city.key).then(data => {
        setAqTimeseries(prev => ({ ...prev, [aqParam.id]: data }));
      }).catch(() => {});
    }
  }, [aqParam.id, city.key]);

  const handleLayerToggle = (layerId) => {
    setLayers(prev =>
      prev.map(l => l.id === layerId ? { ...l, enabled: !l.enabled } : l)
    );
  };

  const lstStats = summary?.parameters?.LST?.statistics || {};
  const ndviStats = summary?.parameters?.NDVI?.statistics || {};
  const no2Stats = summary?.parameters?.NO2?.statistics || {};
  const smStats = summary?.parameters?.SOIL_MOISTURE?.statistics || {};

  const aqStats = summary?.parameters?.[aqParam.id]?.statistics || (summary ? no2Stats : {});
  const aqMean = aqStats.mean != null ? (aqStats.mean * aqParam.scale).toFixed(2) : '--';
  const aqMax = aqStats.max != null ? (aqStats.max * aqParam.scale).toFixed(2) : '--';
  const aqAnomalies = summary?.parameters?.[aqParam.id]?.anomaly_count || summary?.parameters?.NO2?.anomaly_count || 0;
  const AqIcon = aqParam.icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{city.name} Environmental Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Satellite-based environmental monitoring — MODIS, Sentinel-5P, SMAP</p>
          </div>
          <SyncBadge />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Alert Banner */}
        <AlertBanner />

        {/* Stats Cards — show skeletons while summary loads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary ? (
            <StatsCard
              title="Avg Temperature"
              value={`${lstStats.mean || '--'}°C`}
              icon={Thermometer}
              color="red"
              subtitle={`Max: ${lstStats.max || '--'}°C`}
              trend={summary?.parameters?.LST?.anomaly_count ? `${summary.parameters.LST.anomaly_count} anomalies` : null}
            />
          ) : <SkeletonCard />}

          {summary ? (
            <StatsCard
              title="Vegetation Index"
              value={`${ndviStats.mean || '--'} NDVI`}
              icon={Leaf}
              color="emerald"
              subtitle={`Range: ${ndviStats.min || '--'} - ${ndviStats.max || '--'}`}
              trend={summary?.parameters?.NDVI?.hotspot_count ? `${summary.parameters.NDVI.hotspot_count} stress zones` : null}
            />
          ) : <SkeletonCard />}

          {/* Air Quality Dropdown Card */}
          {summary ? (
            <Card padding="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <button
                      onClick={() => setAqDropdownOpen(!aqDropdownOpen)}
                      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    >
                      Air Quality ({aqParam.label})
                      <ChevronDown className={`h-3 w-3 transition-transform ${aqDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aqDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 rounded-lg z-50 min-w-[160px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                        {AQ_PARAMS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setAqParam(p); setAqDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              p.id === aqParam.id ? 'text-cyan-500' : ''
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{aqMean} {aqParam.displayUnit}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Peak: {aqMax} {aqParam.displayUnit}</p>
                  {aqAnomalies > 0 && <p className="text-xs text-amber-400 mt-1">{aqAnomalies} anomalies</p>}
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <AqIcon className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </Card>
          ) : <SkeletonCard />}

          {summary ? (
            <StatsCard
              title="Soil Moisture"
              value={`${smStats.mean || '--'} m³/m³`}
              icon={Droplets}
              color="blue"
              subtitle={smStats.mean < 0.15 ? 'Below average' : 'Normal range'}
              trend={summary?.parameters?.SOIL_MOISTURE?.hotspot_count ? `${summary.parameters.SOIL_MOISTURE.hotspot_count} dry zones` : null}
            />
          ) : <SkeletonCard />}
        </div>

        {/* Environmental Health Score */}
        <HealthScore />

        {/* Map — full width */}
        <Card className="h-[500px] relative" padding="p-0">
          <MapView layers={layers} city={city} layerControl={<LayerControl layers={layers} onToggle={handleLayerToggle} />} />
        </Card>

        {/* Charts — all in a row below the map */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lstTs ? (
            <Card>
              <DrilldownChart
                data={lstTs?.timeseries || []}
                label="Temperature Trend"
                color="#EF4444"
                unit="°C"
                height={180}
              />
            </Card>
          ) : <SkeletonChart />}

          {ndviTs ? (
            <Card>
              <DrilldownChart
                data={ndviTs?.timeseries || []}
                label="Vegetation Health"
                color="#10B981"
                unit="NDVI"
                height={180}
              />
            </Card>
          ) : <SkeletonChart />}

          {aqTimeseries[aqParam.id] ? (
            <Card>
              <DrilldownChart
                data={aqTimeseries[aqParam.id]?.timeseries || []}
                label={`${aqParam.label} Trend`}
                color={aqParam.color}
                unit={aqParam.unit}
                height={180}
              />
            </Card>
          ) : <SkeletonChart />}
        </div>
      </div>
    </DashboardLayout>
  );
}
