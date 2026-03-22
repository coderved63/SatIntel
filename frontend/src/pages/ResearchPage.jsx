import { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Search, X, MapPin, Calendar, Sliders, Download, ChevronDown, Loader2 } from 'lucide-react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-');
  const mi = parseInt(m, 10);
  const mon = MONTH_NAMES[mi - 1] || '';
  return mi === 1 ? `${mon} '${y.slice(2)}` : mon;
}
function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d || ''} ${MONTH_NAMES[parseInt(m,10)-1] || m} ${y}`;
}
import { useNavigate } from 'react-router-dom';
import { useCity } from '../context/CityContext';
import api from '../services/api';

// ── Interactive drill-down chart: Yearly → Monthly ──────────
function ResearchChart({ timeseries, label, color, unit }) {
  const [zoomedYear, setZoomedYear] = useState(null);

  // Aggregate by year
  const yearlyData = useMemo(() => {
    const groups = {};
    timeseries.forEach(d => {
      const year = d.date?.split('-')[0];
      if (!year) return;
      if (!groups[year]) groups[year] = { values: [], count: 0 };
      groups[year].values.push(d.value);
      groups[year].count += d.count || 1;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, g]) => ({
        label: year,
        value: +(g.values.reduce((s, v) => s + v, 0) / g.values.length).toFixed(4),
        min: +Math.min(...g.values).toFixed(4),
        max: +Math.max(...g.values).toFixed(4),
        points: g.count,
        year,
      }));
  }, [timeseries]);

  // Monthly data for zoomed year
  const monthlyData = useMemo(() => {
    if (!zoomedYear) return [];
    const groups = {};
    timeseries.forEach(d => {
      if (!d.date?.startsWith(zoomedYear)) return;
      const month = d.date.substring(0, 7); // "2020-03"
      if (!groups[month]) groups[month] = { values: [], count: 0 };
      groups[month].values.push(d.value);
      groups[month].count += d.count || 1;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, g]) => ({
        label: MONTH_NAMES[parseInt(month.split('-')[1], 10) - 1],
        date: month,
        value: +(g.values.reduce((s, v) => s + v, 0) / g.values.length).toFixed(4),
        min: +Math.min(...g.values).toFixed(4),
        max: +Math.max(...g.values).toFixed(4),
        points: g.count,
      }));
  }, [timeseries, zoomedYear]);

  const chartData = zoomedYear ? monthlyData : yearlyData;
  const gradId = `rg-${(color || '').replace('#', '')}`;

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {label} — {zoomedYear ? `Monthly (${zoomedYear})` : 'Yearly Overview'}
        </p>
        {zoomedYear && (
          <button
            onClick={() => setZoomedYear(null)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            ← All Years
          </button>
        )}
        {!zoomedYear && (
          <p className="text-[9px] italic" style={{ color: 'var(--text-faint)' }}>Click a bar to drill into months</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
          onClick={(e) => {
            if (!zoomedYear && e?.activeLabel) {
              setZoomedYear(e.activeLabel);
            }
          }}
          style={{ cursor: zoomedYear ? 'default' : 'pointer' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--chart-text)', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
          />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} tickCount={5} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', padding: '8px 12px' }}
            labelStyle={{ color: 'var(--tooltip-text)', fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color, fontSize: 13, fontWeight: 600 }}
            formatter={(v, name, props) => {
              const d = props.payload;
              return [`Avg: ${v} ${unit}\nMin: ${d.min}  Max: ${d.max}\nData points: ${d.points}`, ''];
            }}
            labelFormatter={(l) => zoomedYear ? `${l} ${zoomedYear}` : l}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={{ r: 4, fill: color, stroke: 'var(--bg-primary)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: 'var(--bg-primary)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const PARAMETERS = [
  { id: 'LST', label: 'Temperature (LST)', unit: '°C', color: '#EF4444' },
  { id: 'NDVI', label: 'Vegetation (NDVI)', unit: 'index', color: '#10B981' },
  { id: 'NO2', label: 'NO\u2082', unit: 'mol/m\u00B2', color: '#8B5CF6' },
  { id: 'SO2', label: 'SO\u2082', unit: 'mol/m\u00B2', color: '#F59E0B' },
  { id: 'CO', label: 'CO', unit: 'mol/m\u00B2', color: '#DC2626' },
  { id: 'O3', label: 'O\u2083', unit: 'mol/m\u00B2', color: '#2563EB' },
  { id: 'AEROSOL', label: 'Aerosol Index', unit: 'index', color: '#92400E' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', unit: 'm\u00B3/m\u00B3', color: '#3B82F6' },
];

export default function ResearchPage() {
  const navigate = useNavigate();
  const { city } = useCity();

  const [viewState, setViewState] = useState({
    longitude: city.center[1],
    latitude: city.center[0],
    zoom: city.zoom || 10,
    pitch: 0,
    bearing: 0,
  });

  const [pin, setPin] = useState(null);
  const [selectedParams, setSelectedParams] = useState(['LST', 'NDVI', 'NO2']);
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2026-03-22');
  const [radiusKm, setRadiusKm] = useState(10);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeResultParam, setActiveResultParam] = useState(null);

  // Click on map → drop pin
  const handleMapClick = useCallback((e) => {
    // DeckGL onClick provides coordinate differently
    if (e.coordinate) {
      setPin({ lat: e.coordinate[1], lng: e.coordinate[0] });
      setResults(null);
    }
  }, []);

  // Query the research endpoint
  const runQuery = async () => {
    if (!pin) return;
    setLoading(true);
    setResults(null);
    try {
      const paramStr = selectedParams.join(',');
      const { data } = await api.get(
        `/satellite/research?lat=${pin.lat}&lng=${pin.lng}&radius_km=${radiusKm}&start_date=${startDate}&end_date=${endDate}&parameters=${paramStr}`
      );
      setResults(data);
      // Set first param with data as active
      const firstWithData = selectedParams.find(p => data.parameters?.[p]?.total_points > 0);
      setActiveResultParam(firstWithData || selectedParams[0]);
    } catch (err) {
      console.error('Research query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle param selection
  const toggleParam = (id) => {
    setSelectedParams(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Export CSV
  const exportCSV = () => {
    if (!results || !activeResultParam) return;
    const paramData = results.parameters[activeResultParam];
    if (!paramData?.raw_data) return;

    const rows = paramData.raw_data.map(d =>
      `${d.date},${d.lat},${d.lng},${d.value},${activeResultParam}`
    );
    const csv = `date,lat,lng,value,parameter\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${activeResultParam}_${pin?.lat?.toFixed(4)}_${pin?.lng?.toFixed(4)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Deck.gl layers for showing queried points
  const deckLayers = useMemo(() => {
    if (!results || !activeResultParam) return [];
    const paramData = results.parameters[activeResultParam];
    if (!paramData?.raw_data?.length) return [];

    const paramConfig = PARAMETERS.find(p => p.id === activeResultParam);
    const color = paramConfig?.color || '#06B6D4';
    const [r, g, b] = hexToRgb(color);

    return [
      new HeatmapLayer({
        id: 'research-heatmap',
        data: paramData.raw_data,
        getPosition: d => [d.lng, d.lat],
        getWeight: d => Math.abs(d.value),
        radiusPixels: 40,
        intensity: 2,
        threshold: 0.05,
        colorRange: [[r,g,b,50],[r,g,b,100],[r,g,b,150],[r,g,b,200],[r,g,b,255]],
        opacity: 0.6,
      }),
      new ScatterplotLayer({
        id: 'research-points',
        data: paramData.raw_data.slice(0, 200),
        getPosition: d => [d.lng, d.lat],
        getRadius: 200,
        getFillColor: [r, g, b, 180],
        pickable: true,
        radiusUnits: 'meters',
      }),
    ];
  }, [results, activeResultParam]);

  // Radius circle + pin marker overlay
  const pinLayers = useMemo(() => {
    if (!pin) return [];
    return [
      // Radius circle
      new ScatterplotLayer({
        id: 'radius-ring',
        data: [pin],
        getPosition: d => [d.lng, d.lat],
        getRadius: radiusKm * 1000,
        getFillColor: [6, 182, 212, 15],
        getLineColor: [6, 182, 212, 100],
        stroked: true,
        lineWidthMinPixels: 2,
        radiusUnits: 'meters',
      }),
      // Pin outer glow
      new ScatterplotLayer({
        id: 'pin-glow',
        data: [pin],
        getPosition: d => [d.lng, d.lat],
        getRadius: 600,
        getFillColor: [6, 182, 212, 60],
        radiusUnits: 'meters',
      }),
      // Pin center dot
      new ScatterplotLayer({
        id: 'pin-center',
        data: [pin],
        getPosition: d => [d.lng, d.lat],
        getRadius: 200,
        getFillColor: [6, 182, 212, 255],
        getLineColor: [255, 255, 255, 255],
        stroked: true,
        lineWidthMinPixels: 2,
        radiusUnits: 'meters',
      }),
    ];
  }, [pin, radiusKm]);

  const activeParamData = results?.parameters?.[activeResultParam];
  const activeParamConfig = PARAMETERS.find(p => p.id === activeResultParam);

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'var(--bg-primary)' }}>
      {/* Map */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        controller={true}
        layers={[...pinLayers, ...deckLayers]}
        onClick={(info, event) => {
          if (info.coordinate) {
            setPin({ lat: info.coordinate[1], lng: info.coordinate[0] });
            setResults(null);
          }
        }}
        getCursor={() => 'crosshair'}
        useDevicePixels={2}
        onError={(error) => console.warn('DeckGL:', error.message)}
        getTooltip={({ object }) => {
          if (!object || object.value === undefined) return null;
          return {
            html: `<div style="padding:6px;font-size:11px;"><b>${object.value}</b><br/>${object.date}<br/>(${object.lat}, ${object.lng})</div>`,
            style: { backgroundColor: 'var(--tooltip-bg)', color: 'var(--tooltip-text)', border: '1px solid var(--tooltip-border)', borderRadius: '6px' },
          };
        }}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          attributionControl={false}
        >
          <NavigationControl position="top-right" />
        </Map>
      </DeckGL>

      {/* Pin marker — rendered as a Deck.gl layer for accurate geo-positioning */}

      {/* Close button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 z-30 flex items-center gap-2 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm transition-all"
        style={{ background: 'var(--bg-nav)', border: '1px solid var(--bg-nav-border)', color: 'var(--text-secondary)' }}
      >
        <X className="h-4 w-4" />
        Exit Research
      </button>

      {/* Coordinates display */}
      {pin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-2 text-sm flex items-center gap-3" style={{ background: 'var(--bg-nav)' }}>
          <span className="text-cyan-400 font-mono">{pin.lat.toFixed(6)}°N, {pin.lng.toFixed(6)}°E</span>
          <span style={{ color: 'var(--text-faint)' }}>|</span>
          <span style={{ color: 'var(--text-faint)' }}>r = {radiusKm}km</span>
          {results?.nearest_city && (
            <>
              <span style={{ color: 'var(--text-faint)' }}>|</span>
              <span className="text-emerald-400 text-xs capitalize">{results.nearest_city}</span>
            </>
          )}
        </div>
      )}

      {/* Instruction overlay (when no pin) */}
      {!pin && !results && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="backdrop-blur-md rounded-2xl px-8 py-6 text-center max-w-md" style={{ background: 'var(--bg-nav)', border: '1px solid var(--bg-nav-border)' }}>
            <MapPin className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Research Mode</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Click anywhere on the map to drop a pin. Then configure parameters, date range, and radius to query the satellite database.
            </p>
          </div>
        </div>
      )}

      {/* Right Panel */}
      {pin && (
        <div className={`absolute top-0 right-0 h-full z-30 transition-all duration-300 ${showPanel ? 'w-[400px]' : 'w-0'}`}>
          {/* Toggle panel */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 backdrop-blur-md rounded-l-xl px-2 py-4 transition-colors"
            style={{ background: 'var(--bg-nav)', border: '1px solid var(--bg-nav-border)', color: 'var(--text-muted)' }}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showPanel ? 'rotate-[-90deg]' : 'rotate-90'}`} />
          </button>

          {showPanel && (
            <div className="h-full backdrop-blur-xl overflow-y-auto" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
              <div className="p-5 space-y-5">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Search className="h-5 w-5 text-cyan-400" />
                    Query Builder
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Configure your spatial-temporal query</p>
                </div>

                {/* Parameters */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Parameters</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {PARAMETERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => toggleParam(p.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all`}
                        style={{
                          background: selectedParams.includes(p.id) ? 'var(--bg-badge)' : 'transparent',
                          color: selectedParams.includes(p.id) ? 'var(--text-primary)' : 'var(--text-faint)',
                          border: selectedParams.includes(p.id) ? '1px solid var(--border)' : '1px solid transparent',
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{
                          backgroundColor: p.color,
                          opacity: selectedParams.includes(p.id) ? 1 : 0.3,
                        }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <Calendar className="h-3 w-3" /> Date Range
                  </label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-500/50"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-500/50"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Radius */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <Sliders className="h-3 w-3" /> Search Radius: {radiusKm}km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radiusKm}
                    onChange={e => setRadiusKm(parseInt(e.target.value))}
                    className="w-full mt-2 accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    <span>1km</span><span>25km</span><span>50km</span>
                  </div>
                </div>

                {/* Run Query Button */}
                <button
                  onClick={runQuery}
                  disabled={loading || selectedParams.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                  style={loading || selectedParams.length === 0 ? { background: 'var(--skeleton)', color: 'var(--text-muted)' } : undefined}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Querying...</>
                  ) : (
                    <><Search className="h-4 w-4" /> Run Query</>
                  )}
                </button>

                {/* Results */}
                {results && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Results</h4>
                      <button
                        onClick={exportCSV}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                      >
                        <Download className="h-3 w-3" /> CSV
                      </button>
                    </div>

                    {/* Param tabs */}
                    <div className="flex gap-1 flex-wrap">
                      {selectedParams.map(pid => {
                        const pData = results.parameters?.[pid];
                        const pConfig = PARAMETERS.find(p => p.id === pid);
                        return (
                          <button
                            key={pid}
                            onClick={() => setActiveResultParam(pid)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
                            style={{
                              background: activeResultParam === pid ? 'var(--bg-badge)' : 'transparent',
                              color: activeResultParam === pid ? 'var(--text-primary)' : 'var(--text-faint)',
                              border: activeResultParam === pid ? '1px solid var(--border)' : '1px solid transparent',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pConfig?.color }} />
                            {pConfig?.label}
                            <span style={{ color: 'var(--text-faint)' }}>{pData?.total_points || 0}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Interactive Timeseries — Year ↔ Month drill-down */}
                    {activeParamData?.timeseries?.length > 0 && (
                      <ResearchChart
                        timeseries={activeParamData.timeseries}
                        label={activeParamConfig?.label}
                        color={activeParamConfig?.color}
                        unit={activeParamConfig?.unit}
                      />
                    )}

                    {/* Stats summary */}
                    {activeParamData?.statistics && Object.keys(activeParamData.statistics).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Mean', value: activeParamData.statistics.mean },
                          { label: 'Min', value: activeParamData.statistics.min },
                          { label: 'Max', value: activeParamData.statistics.max },
                        ].map(s => (
                          <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
                            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value?.toFixed?.(4) ?? '--'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data count */}
                    {activeParamData && (
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-faint)' }}>
                        {activeParamData.total_points} data points found within {radiusKm}km radius
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
