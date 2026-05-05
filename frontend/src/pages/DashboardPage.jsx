import { useEffect, useState } from 'react';
import { Thermometer, Leaf, Wind, Droplets, ChevronDown, Cloud, Flame, Sun, Haze } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import EvidenceContextPanel from '../components/common/EvidenceContextPanel';
import MapView from '../components/dashboard/MapView';
import StatsCard from '../components/dashboard/StatsCard';
import DrilldownChart from '../components/dashboard/DrilldownChart';
import DashboardForecastChart from '../components/dashboard/DashboardForecastChart';
import LayerControl from '../components/dashboard/LayerControl';
import HealthScore from '../components/dashboard/HealthScore';
import AlertBanner from '../components/dashboard/AlertBanner';
import { satelliteService } from '../services/satelliteService';
import { analyticsService } from '../services/analyticsService';
import { useCity } from '../context/CityContext';
import { useAnalysisContext } from '../context/AnalysisContext';

function SyncBadge() {
  const [syncInfo, setSyncInfo] = useState(null);

  useEffect(() => {
    fetch('/api/v1/satellite/last-synced')
      .then(response => response.json())
      .then(setSyncInfo)
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Last synced: <span className="text-emerald-400">{syncInfo ? '22 Mar 2026' : 'Syncing...'}</span>
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
          Latest valid observations are shown on each metric card.
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card padding="p-4">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--skeleton)' }} />
        <div className="h-8 w-28 rounded" style={{ background: 'var(--skeleton)' }} />
        <div className="h-3 w-40 rounded" style={{ background: 'var(--skeleton)' }} />
      </div>
    </Card>
  );
}

const AQ_PARAMS = [
  { id: 'NO2', label: 'NO2', unit: 'mol/m^2', scale: 1e6, displayUnit: 'umol/m^2', color: '#8B5CF6', icon: Wind },
  { id: 'SO2', label: 'SO2', unit: 'mol/m^2', scale: 1e6, displayUnit: 'umol/m^2', color: '#F59E0B', icon: Cloud },
  { id: 'CO', label: 'CO', unit: 'mol/m^2', scale: 1e2, displayUnit: 'x10^-2 mol/m^2', color: '#DC2626', icon: Flame },
  { id: 'O3', label: 'O3', unit: 'mol/m^2', scale: 1e3, displayUnit: 'mmol/m^2', color: '#2563EB', icon: Sun },
  { id: 'AEROSOL', label: 'Aerosol', unit: 'index', scale: 1, displayUnit: 'index', color: '#92400E', icon: Haze },
];

function formatMetric(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) {
    return '--';
  }
  return Number(value).toFixed(decimals);
}

export default function DashboardPage() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const [summary, setSummary] = useState(null);
  const [lstTs, setLstTs] = useState(null);
  const [ndviTs, setNdviTs] = useState(null);
  const [aqTimeseries, setAqTimeseries] = useState({});
  const [aqParam, setAqParam] = useState(AQ_PARAMS[0]);
  const [aqDropdownOpen, setAqDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const [forecastLST, setForecastLST] = useState(null);
  const [forecastNDVI, setForecastNDVI] = useState(null);
  const [forecastAQ, setForecastAQ] = useState(null);
  const [layers, setLayers] = useState([
    { id: 'LST', label: 'Temperature (LST)', color: '#EF4444', enabled: true },
    { id: 'NDVI', label: 'Vegetation (NDVI)', color: '#10B981', enabled: true },
    { id: 'NO2', label: 'NO2', color: '#8B5CF6', enabled: false },
    { id: 'SO2', label: 'SO2', color: '#F59E0B', enabled: false },
    { id: 'CO', label: 'CO', color: '#DC2626', enabled: false },
    { id: 'O3', label: 'O3', color: '#2563EB', enabled: false },
    { id: 'AEROSOL', label: 'Aerosol Index', color: '#92400E', enabled: false },
    { id: 'SOIL_MOISTURE', label: 'Soil Moisture', color: '#3B82F6', enabled: false },
  ]);

  useEffect(() => {
    setSummary(null);
    setLstTs(null);
    setNdviTs(null);
    setAqTimeseries({});
    setForecastLST(null);
    setForecastNDVI(null);
    setError(null);

    satelliteService.getTimeSeries('LST', city.key, dateRange).then(setLstTs).catch(() => {});
    satelliteService.getTimeSeries('NDVI', city.key, dateRange).then(setNdviTs).catch(() => {});
    satelliteService.getTimeSeries('NO2', city.key, dateRange).then(data => setAqTimeseries(prev => ({ ...prev, NO2: data }))).catch(() => {});
    analyticsService.getSummary(city.key, dateRange).then(setSummary).catch(err => setError(err.message));
    analyticsService.getTrends('LST', city.key, dateRange).then(setForecastLST).catch(() => setForecastLST(null));
    analyticsService.getTrends('NDVI', city.key, dateRange).then(setForecastNDVI).catch(() => setForecastNDVI(null));
  }, [city.key, dateRange.start_date, dateRange.end_date]);

  useEffect(() => {
    analyticsService.getTrends(aqParam.id, city.key, dateRange).then(setForecastAQ).catch(() => setForecastAQ(null));
  }, [aqParam.id, city.key, dateRange.start_date, dateRange.end_date]);

  useEffect(() => {
    if (!aqTimeseries[aqParam.id]) {
      satelliteService.getTimeSeries(aqParam.id, city.key, dateRange).then(data => {
        setAqTimeseries(prev => ({ ...prev, [aqParam.id]: data }));
      }).catch(() => {});
    }
  }, [aqParam.id, city.key, dateRange.start_date, dateRange.end_date]);

  const handleLayerToggle = layerId => {
    setLayers(prev => prev.map(layer => layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer));
  };

  const aqStats = summary?.parameters?.[aqParam.id]?.statistics || {};
  const aqMean = aqStats.mean != null ? (aqStats.mean * aqParam.scale).toFixed(2) : '--';
  const aqMax = aqStats.max != null ? (aqStats.max * aqParam.scale).toFixed(2) : '--';
  const AqIcon = aqParam.icon;
  const lstMean = summary?.parameters?.LST?.statistics?.mean;
  const lstMax = summary?.parameters?.LST?.statistics?.max;
  const ndviMean = summary?.parameters?.NDVI?.statistics?.mean;
  const ndviMin = summary?.parameters?.NDVI?.statistics?.min;
  const ndviMax = summary?.parameters?.NDVI?.statistics?.max;
  const soilMean = summary?.parameters?.SOIL_MOISTURE?.statistics?.mean;
  const soilAvailableCoverage = summary?.data_freshness?.available_coverage_by_parameter?.SOIL_MOISTURE;
  const soilCoverage = summary?.parameters?.SOIL_MOISTURE?.data_coverage || {};
  const soilHasWindowData = (soilCoverage.sample_count || 0) > 0;

  const statCardData = [
    {
      title: 'Avg Temperature',
      value: `${formatMetric(lstMean, 2)} deg C`,
      icon: Thermometer,
      color: 'red',
      subtitle: `Max: ${formatMetric(lstMax, 2)} deg C`,
      trend: summary?.parameters?.LST?.anomaly_count ? `${summary.parameters.LST.anomaly_count} anomalies` : null,
      coverage: `${summary?.parameters?.LST?.data_coverage?.start_date || '--'} to ${summary?.parameters?.LST?.data_coverage?.end_date || '--'}`,
      note: summary?.parameters?.LST?.metric_represents,
    },
    {
      title: 'Vegetation Index',
      value: `${formatMetric(ndviMean, 3)} NDVI`,
      icon: Leaf,
      color: 'emerald',
      subtitle: `Range: ${formatMetric(ndviMin, 3)} - ${formatMetric(ndviMax, 3)}`,
      trend: summary?.parameters?.NDVI?.hotspot_count ? `${summary.parameters.NDVI.hotspot_count} stress zones` : null,
      coverage: `${summary?.parameters?.NDVI?.data_coverage?.start_date || '--'} to ${summary?.parameters?.NDVI?.data_coverage?.end_date || '--'}`,
      note: summary?.parameters?.NDVI?.metric_represents,
    },
    {
      title: 'Soil Moisture',
      value: `${formatMetric(soilMean, 3)} m3/m3`,
      icon: Droplets,
      color: 'blue',
      subtitle: soilMean == null ? 'No data in selected window' : (soilMean < 0.15 ? 'Below average' : 'Normal range'),
      trend: summary?.parameters?.SOIL_MOISTURE?.hotspot_count ? `${summary.parameters.SOIL_MOISTURE.hotspot_count} dry zones` : null,
      coverage: soilHasWindowData
        ? `${soilCoverage.start_date || '--'} to ${soilCoverage.end_date || '--'}`
        : `Available data: ${soilAvailableCoverage?.start_date || '--'} to ${soilAvailableCoverage?.end_date || '--'}`,
      note: soilHasWindowData
        ? summary?.parameters?.SOIL_MOISTURE?.metric_represents
        : 'The active dashboard window does not include valid soil-moisture scenes for this city.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{city.name} Environmental Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Decision-grade environmental screening with explicit temporal context</p>
          </div>
          <SyncBadge />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <AlertBanner />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary ? statCardData.slice(0, 2).map(card => <StatsCard key={card.title} {...card} />) : <><SkeletonCard /><SkeletonCard /></>}

          {summary ? (
            <Card padding="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <button
                      onClick={() => setAqDropdownOpen(!aqDropdownOpen)}
                      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Air Quality ({aqParam.label})
                      <ChevronDown className={`h-3 w-3 transition-transform ${aqDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aqDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 rounded-lg z-50 min-w-[160px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                        {AQ_PARAMS.map(param => (
                          <button
                            key={param.id}
                            onClick={() => { setAqParam(param); setAqDropdownOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                            style={{ color: param.id === aqParam.id ? 'var(--accent)' : 'var(--text-secondary)' }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: param.color }} />
                            {param.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{aqMean} {aqParam.displayUnit}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Peak: {aqMax} {aqParam.displayUnit}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
                    {summary?.parameters?.[aqParam.id]?.data_coverage?.start_date || '--'} to {summary?.parameters?.[aqParam.id]?.data_coverage?.end_date || '--'}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
                    {summary?.parameters?.[aqParam.id]?.metric_represents || 'City-level air-quality screening metric for the active window.'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <AqIcon className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </Card>
          ) : <SkeletonCard />}

          {summary ? <StatsCard {...statCardData[2]} /> : <SkeletonCard />}
        </div>

        <EvidenceContextPanel title="Dashboard Evidence Context" evidence={summary} compact />

        <HealthScore />

        <Card className="h-[500px] relative" padding="p-0">
          <MapView layers={layers} city={city} layerControl={<LayerControl layers={layers} onToggle={handleLayerToggle} />} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <DrilldownChart data={lstTs?.timeseries || []} label="Temperature Trend" color="#EF4444" unit="deg C" height={180} />
          </Card>
          <Card>
            <DrilldownChart data={ndviTs?.timeseries || []} label="Vegetation Health" color="#10B981" unit="NDVI" height={180} />
          </Card>
          <Card>
            <DrilldownChart data={aqTimeseries[aqParam.id]?.timeseries || []} label={`${aqParam.label} Trend`} color={aqParam.color} unit={aqParam.unit} height={180} />
          </Card>
        </div>

        <div>
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              ML timelines (analysis window)
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
              City-mean series with a short forward continuation path from the same directional model as ML Analytics — timeline only, no accuracy metrics.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <DashboardForecastChart
                data={forecastLST}
                label="Land surface temperature"
                histColor="#EF4444"
                unit="deg C"
                height={200}
              />
            </Card>
            <Card>
              <DashboardForecastChart
                data={forecastNDVI}
                label="Vegetation (NDVI)"
                histColor="#10B981"
                unit="NDVI"
                height={200}
              />
            </Card>
            <Card>
              <DashboardForecastChart
                data={forecastAQ}
                label={`${aqParam.label} (city mean)`}
                histColor={aqParam.color}
                unit={aqParam.displayUnit}
                height={200}
              />
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
