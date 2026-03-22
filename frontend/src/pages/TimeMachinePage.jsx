import { useState, useEffect, useMemo } from 'react';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { timeMachineService } from '../services/timeMachineService';
import { useCity } from '../context/CityContext';
import { Clock, Thermometer, Leaf, Wind, Droplets, Map as MapIcon, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const PARAMS = [
  { id: 'LST', label: 'Surface Temperature', icon: Thermometer, color: '#EF4444', unit: 'C' },
  { id: 'NDVI', label: 'Vegetation (NDVI)', icon: Leaf, color: '#10B981', unit: 'index' },
  { id: 'NO2', label: 'NO2 Pollution', icon: Wind, color: '#8B5CF6', unit: 'mol/m2' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', icon: Droplets, color: '#3B82F6', unit: 'm3/m3' },
  { id: 'LAND_USE', label: 'Land Use Change', icon: MapIcon, color: '#6B7280', unit: 'class' },
];

const COLOR_RANGES = {
  temperature: [[59,130,246],[6,182,212],[251,191,36],[249,115,22],[239,68,68]],
  vegetation: [[146,64,14],[217,119,6],[132,204,22],[34,197,94],[5,150,105]],
  pollution: [[16,185,129],[132,204,22],[251,191,36],[168,85,247],[124,58,237]],
  moisture: [[239,68,68],[249,115,22],[251,191,36],[59,130,246],[29,78,216]],
  landuse: [[0,119,190],[144,238,144],[34,139,34],[105,105,105],[210,180,140]],
  default: [[59,130,246],[6,182,212],[251,191,36],[249,115,22],[239,68,68]],
};

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function TimeMachinePage() {
  const { city } = useCity();
  const [param, setParam] = useState('LST');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState('b'); // 'a' = 2023, 'b' = 2024
  const [transitioning, setTransitioning] = useState(false);

  const [viewState, setViewState] = useState({
    longitude: city.center[1],
    latitude: city.center[0],
    zoom: (city.zoom || 11) - 0.5,
    pitch: 0,
    bearing: 0,
  });

  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: city.center[1],
      latitude: city.center[0],
      zoom: (city.zoom || 11) - 0.5,
    }));
  }, [city]);

  useEffect(() => {
    setLoading(true);
    timeMachineService.compare(param, city.key)
      .then(setData)
      .catch(e => console.error('Time machine:', e))
      .finally(() => setLoading(false));
  }, [param, city.key]);

  const switchYear = (year) => {
    if (year === activeYear) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveYear(year);
      setTimeout(() => setTransitioning(false), 300);
    }, 150);
  };

  const selectedParam = PARAMS.find(p => p.id === param) || PARAMS[0];
  const scale = data?.meta?.scale || 'default';
  const colors = COLOR_RANGES[scale] || COLOR_RANGES.default;
  const activeGrid = activeYear === 'a' ? (data?.grid_a || []) : (data?.grid_b || []);
  const yearLabel = activeYear === 'a' ? data?.year_a : data?.year_b;

  const isWorse = (param === 'NDVI' || param === 'SOIL_MOISTURE')
    ? data?.change_direction === 'decreased'
    : data?.change_direction === 'increased';

  // Compute per-cell change for scatter overlay
  const changePoints = useMemo(() => {
    if (!data?.grid_a?.length || !data?.grid_b?.length) return [];
    const mapA = {};
    data.grid_a.forEach(p => { mapA[`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`] = p.value; });
    return data.grid_b.map(p => {
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      const valA = mapA[key];
      if (valA === undefined) return null;
      const diff = p.value - valA;
      return { lat: p.lat, lng: p.lng, value: p.value, diff, absDiff: Math.abs(diff) };
    }).filter(Boolean);
  }, [data]);

  const layers = useMemo(() => {
    const result = [];

    // Heatmap layer
    result.push(new HeatmapLayer({
      id: 'heat-main',
      data: activeGrid,
      getPosition: d => [d.lng, d.lat],
      getWeight: d => Math.abs(d.value),
      radiusPixels: 50,
      intensity: 1.5,
      threshold: 0.03,
      colorRange: colors,
      opacity: transitioning ? 0.3 : 0.85,
      transitions: { getWeight: 500 },
    }));

    // Change indicators — show arrows/dots where biggest changes happened
    if (changePoints.length > 0 && !transitioning) {
      const maxDiff = Math.max(...changePoints.map(p => p.absDiff));
      result.push(new ScatterplotLayer({
        id: 'change-dots',
        data: changePoints.filter(p => p.absDiff > maxDiff * 0.3), // top 70% changes
        getPosition: d => [d.lng, d.lat],
        getRadius: d => 200 + (d.absDiff / maxDiff) * 800,
        getFillColor: d => {
          // Red = got worse, Green = got better
          const worse = (param === 'NDVI' || param === 'SOIL_MOISTURE') ? d.diff < 0 : d.diff > 0;
          return worse ? [239, 68, 68, 120] : [16, 185, 129, 120];
        },
        radiusMinPixels: 4,
        radiusMaxPixels: 20,
        opacity: 0.7,
      }));
    }

    return result;
  }, [activeGrid, changePoints, colors, transitioning, param]);

  // Stats for the active year
  const activeVals = activeGrid.map(p => p.value);
  const activeMean = activeVals.length ? (activeVals.reduce((a, b) => a + b, 0) / activeVals.length).toFixed(2) : '--';
  const activeMax = activeVals.length ? Math.max(...activeVals).toFixed(2) : '--';
  const activeMin = activeVals.length ? Math.min(...activeVals).toFixed(2) : '--';

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-teal-400" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Environmental Time Machine</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Toggle between years to see environmental change — real satellite data
            </p>
          </div>
        </div>

        {/* Parameter selector */}
        <div className="flex gap-2 flex-wrap">
          {PARAMS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setParam(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  param === p.id
                    ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
                style={param !== p.id ? { background: 'var(--bg-card)' } : undefined}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Change summary */}
        {data && !loading && data.avg_change !== undefined && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            isWorse
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {isWorse ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            <span className="text-sm font-medium">
              {selectedParam.label} {data.change_direction} by {Math.abs(data.avg_change).toFixed(4)} {data.meta?.unit || ''}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              {data.year_a} <ArrowRight className="h-3 w-3 inline" /> {data.year_b} (city average)
            </span>
          </div>
        )}

        {/* Year Toggle — THE KEY UI */}
        {data && !loading && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => switchYear('a')}
              className={`px-6 py-2.5 rounded-l-xl text-sm font-bold transition-all border ${
                activeYear === 'a'
                  ? 'bg-slate-700 border-slate-500 text-white scale-105'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              style={activeYear !== 'a' ? { background: 'var(--bg-card)' } : undefined}
            >
              {data.year_a}
            </button>
            <div className="px-3 py-2 text-xs text-teal-400 font-mono">vs</div>
            <button
              onClick={() => switchYear('b')}
              className={`px-6 py-2.5 rounded-r-xl text-sm font-bold transition-all border ${
                activeYear === 'b'
                  ? 'bg-teal-600 border-teal-500 text-white scale-105'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              style={activeYear !== 'b' ? { background: 'var(--bg-card)' } : undefined}
            >
              {data.year_b}
            </button>
          </div>
        )}

        {/* Map */}
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader text={`Loading ${selectedParam.label} comparison...`} />
          </div>
        ) : data ? (
          <div className="relative h-[500px] rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <DeckGL
              viewState={viewState}
              onViewStateChange={({ viewState: vs }) => setViewState(vs)}
              controller={true}
              layers={layers}
              style={{ width: '100%', height: '100%' }}
            >
              <Map mapStyle={BASEMAP} style={{ width: '100%', height: '100%' }} />
            </DeckGL>

            {/* Year badge */}
            <div className={`absolute top-4 left-4 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm z-10 transition-all duration-300 ${
              transitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            } ${activeYear === 'b' ? 'bg-teal-600/90 text-white border border-teal-400' : 'bg-slate-800/90 text-white border border-slate-600'}`}>
              Showing: {yearLabel}
            </div>

            {/* Stats overlay */}
            <div className="absolute bottom-4 right-4 px-4 py-3 rounded-xl backdrop-blur-sm z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                {selectedParam.label} — {yearLabel}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-slate-300">Mean: <span className="text-white font-mono">{activeMean}</span></span>
                <span className="text-slate-300">Max: <span className="text-red-400 font-mono">{activeMax}</span></span>
                <span className="text-slate-300">Min: <span className="text-blue-400 font-mono">{activeMin}</span></span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{activeGrid.length} grid cells</div>
            </div>

            {/* Legend: change dots */}
            <div className="absolute bottom-4 left-4 px-3 py-2 rounded-xl backdrop-blur-sm z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Change Indicators</div>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/70" /> Got worse
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/70" /> Improved
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── INTERPRETATION PANEL ── */}
        {data && !loading && data.interpretation && (
          <Card className="border-teal-500/20">
            {/* Summary + Insight */}
            <div className="mb-4">
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {data.interpretation.summary}
              </p>
              <p className={`text-xs font-medium ${
                data.interpretation.severity === 'critical' ? 'text-red-400' :
                data.interpretation.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {data.interpretation.insight}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {data.total_cells_compared} grid cells compared | {data.year_a} vs {data.year_b}
              </p>
            </div>

            {/* Zone Breakdown */}
            {data.zone_changes?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Zone Breakdown</p>
                <div className="space-y-1.5">
                  {data.zone_changes.map((z, i) => {
                    const pct = Math.min(Math.abs(z.avg_change) / (Math.max(...data.zone_changes.map(zz => Math.abs(zz.avg_change))) || 1) * 100, 100);
                    const worse = (param === 'NDVI' || param === 'SOIL_MOISTURE') ? z.avg_change < 0 : z.avg_change > 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-28 shrink-0" style={{ color: 'var(--text-secondary)' }}>{z.zone}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary, #1e293b)' }}>
                          <div className={`h-full rounded-full ${worse ? 'bg-red-500/70' : 'bg-emerald-500/70'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-mono w-20 text-right ${worse ? 'text-red-400' : 'text-emerald-400'}`}>
                          {z.avg_change > 0 ? '+' : ''}{z.avg_change.toFixed(3)}
                        </span>
                        <span className="text-[10px] w-12 text-right" style={{ color: 'var(--text-muted)' }}>{z.cells} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Worsened + Improved */}
            <div className="grid grid-cols-2 gap-4">
              {data.top_worsened?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Most Worsened</p>
                  {data.top_worsened.slice(0, 3).map((w, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs" style={{ borderBottom: '1px solid var(--bg-card-border, #1e293b33)' }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{w.lat.toFixed(3)}, {w.lng.toFixed(3)}</span>
                      <span className="text-red-400 font-mono">{w.change > 0 ? '+' : ''}{w.change.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.top_improved?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Most Improved</p>
                  {data.top_improved.slice(0, 3).map((w, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs" style={{ borderBottom: '1px solid var(--bg-card-border, #1e293b33)' }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{w.lat.toFixed(3)}, {w.lng.toFixed(3)}</span>
                      <span className="text-emerald-400 font-mono">{w.change > 0 ? '+' : ''}{w.change.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Bottom info cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="p-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>How to Use</p>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <p>Click <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{data?.year_a}</span> or <span className="text-teal-400 font-bold">{data?.year_b}</span> to switch years</p>
              <p><span className="text-red-400">Red dots</span> = areas that got worse</p>
              <p><span className="text-emerald-400">Green dots</span> = areas that improved</p>
              <p>Heatmap shows the selected year's data</p>
              <p>Scroll + drag to navigate the map</p>
            </div>
          </Card>
          <Card padding="p-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Color Scale — {selectedParam.label}
            </p>
            <div className="h-3 rounded-full mb-1" style={{
              background: scale === 'temperature'
                ? 'linear-gradient(to right, #3B82F6, #06B6D4, #FBBF24, #F97316, #EF4444)'
                : scale === 'vegetation'
                ? 'linear-gradient(to right, #92400E, #D97706, #84CC16, #22C55E, #059669)'
                : scale === 'pollution'
                ? 'linear-gradient(to right, #10B981, #84CC16, #FBBF24, #A855F7, #7C3AED)'
                : scale === 'moisture'
                ? 'linear-gradient(to right, #EF4444, #F97316, #FBBF24, #3B82F6, #1D4ED8)'
                : 'linear-gradient(to right, #0077BE, #90EE90, #228B22, #696969)'
            }} />
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {scale === 'temperature' && <><span>Cool</span><span>Hot</span></>}
              {scale === 'vegetation' && <><span>Bare</span><span>Dense</span></>}
              {scale === 'pollution' && <><span>Clean</span><span>Polluted</span></>}
              {scale === 'moisture' && <><span>Dry</span><span>Wet</span></>}
              {scale === 'landuse' && <><span>Water</span><span>Urban</span></>}
            </div>
            <p className="text-[10px] mt-2 font-mono" style={{ color: 'var(--text-faint, var(--text-muted))' }}>
              {param === 'LST' ? 'NASA MODIS MOD11A2' : param === 'NDVI' ? 'NASA MODIS MOD13A2' : param === 'LAND_USE' ? 'USGS Landsat 8/9' : 'ESA Sentinel-5P'} via GEE
            </p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
