import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Search, X, MapPin, Calendar, Sliders, Download, ChevronDown, Loader2, Info } from 'lucide-react';
import { useCity } from '../context/CityContext';
import api from '../services/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ResearchChart({ timeseries, label, color, unit }) {
  const [zoomedYear, setZoomedYear] = useState(null);

  const yearlyData = useMemo(() => {
    const groups = {};
    timeseries.forEach(item => {
      const year = item.date?.split('-')[0];
      if (!year) return;
      if (!groups[year]) groups[year] = { values: [], count: 0 };
      groups[year].values.push(item.value);
      groups[year].count += item.count || 1;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, group]) => ({
        label: year,
        value: +(group.values.reduce((sum, current) => sum + current, 0) / group.values.length).toFixed(4),
        min: +Math.min(...group.values).toFixed(4),
        max: +Math.max(...group.values).toFixed(4),
        points: group.count,
      }));
  }, [timeseries]);

  const monthlyData = useMemo(() => {
    if (!zoomedYear) return [];
    const groups = {};
    timeseries.forEach(item => {
      if (!item.date?.startsWith(zoomedYear)) return;
      const month = item.date.substring(0, 7);
      if (!groups[month]) groups[month] = { values: [], count: 0 };
      groups[month].values.push(item.value);
      groups[month].count += item.count || 1;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, group]) => ({
        label: MONTH_NAMES[parseInt(month.split('-')[1], 10) - 1],
        date: month,
        value: +(group.values.reduce((sum, current) => sum + current, 0) / group.values.length).toFixed(4),
        min: +Math.min(...group.values).toFixed(4),
        max: +Math.max(...group.values).toFixed(4),
        points: group.count,
      }));
  }, [timeseries, zoomedYear]);

  const chartData = zoomedYear ? monthlyData : yearlyData;
  const gradientId = `rg-${(color || '').replace('#', '')}`;

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {label} - {zoomedYear ? `Monthly (${zoomedYear})` : 'Yearly Overview'}
        </p>
        {zoomedYear ? (
          <button
            onClick={() => setZoomedYear(null)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Back to all years
          </button>
        ) : (
          <p className="text-[9px] italic" style={{ color: 'var(--text-faint)' }}>Click a year to drill into monthly behavior</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
          onClick={event => {
            if (!zoomedYear && event?.activeLabel) {
              setZoomedYear(event.activeLabel);
            }
          }}
          style={{ cursor: zoomedYear ? 'default' : 'pointer' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
            formatter={(value, _name, props) => {
              const item = props.payload;
              return [`Avg: ${value} ${unit}\nMin: ${item.min}  Max: ${item.max}\nData points: ${item.points}`, ''];
            }}
            labelFormatter={labelValue => zoomedYear ? `${labelValue} ${zoomedYear}` : labelValue}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
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
  { id: 'NO2', label: 'NO₂', unit: 'mol/m²', color: '#8B5CF6' },
  { id: 'SO2', label: 'SO₂', unit: 'mol/m²', color: '#F59E0B' },
  { id: 'CO', label: 'CO', unit: 'mol/m²', color: '#DC2626' },
  { id: 'O3', label: 'O₃', unit: 'mol/m²', color: '#2563EB' },
  { id: 'AEROSOL', label: 'Aerosol Index', unit: 'index', color: '#92400E' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', unit: 'm³/m³', color: '#3B82F6' },
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
      const firstWithData = selectedParams.find(param => data.parameters?.[param]?.total_points > 0);
      setActiveResultParam(firstWithData || selectedParams[0]);
    } catch (err) {
      console.error('Research query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleParam = id => {
    setSelectedParams(prev => (
      prev.includes(id) ? prev.filter(param => param !== id) : [...prev, id]
    ));
  };

  const exportCSV = () => {
    if (!results || !activeResultParam) return;
    const paramData = results.parameters[activeResultParam];
    if (!paramData?.raw_data) return;

    const rows = paramData.raw_data.map(item => `${item.date},${item.lat},${item.lng},${item.value},${activeResultParam}`);
    const csv = `date,lat,lng,value,parameter\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `research_${activeResultParam}_${pin?.lat?.toFixed(4)}_${pin?.lng?.toFixed(4)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deckLayers = useMemo(() => {
    if (!results || !activeResultParam) return [];
    const paramData = results.parameters[activeResultParam];
    if (!paramData?.raw_data?.length) return [];

    const paramConfig = PARAMETERS.find(param => param.id === activeResultParam);
    const color = paramConfig?.color || '#06B6D4';
    const [r, g, b] = hexToRgb(color);

    return [
      new HeatmapLayer({
        id: 'research-heatmap',
        data: paramData.raw_data,
        getPosition: item => [item.lng, item.lat],
        getWeight: item => Math.abs(item.value),
        radiusPixels: 40,
        intensity: 2,
        threshold: 0.05,
        colorRange: [[r, g, b, 50], [r, g, b, 100], [r, g, b, 150], [r, g, b, 200], [r, g, b, 255]],
        opacity: 0.6,
      }),
      new ScatterplotLayer({
        id: 'research-points',
        data: paramData.raw_data.slice(0, 200),
        getPosition: item => [item.lng, item.lat],
        getRadius: 200,
        getFillColor: [r, g, b, 180],
        pickable: true,
        radiusUnits: 'meters',
      }),
    ];
  }, [results, activeResultParam]);

  const pinLayers = useMemo(() => {
    if (!pin) return [];
    return [
      new ScatterplotLayer({
        id: 'radius-ring',
        data: [pin],
        getPosition: item => [item.lng, item.lat],
        getRadius: radiusKm * 1000,
        getFillColor: [6, 182, 212, 15],
        getLineColor: [6, 182, 212, 100],
        stroked: true,
        lineWidthMinPixels: 2,
        radiusUnits: 'meters',
      }),
      new ScatterplotLayer({
        id: 'pin-glow',
        data: [pin],
        getPosition: item => [item.lng, item.lat],
        getRadius: 600,
        getFillColor: [6, 182, 212, 60],
        radiusUnits: 'meters',
      }),
      new ScatterplotLayer({
        id: 'pin-center',
        data: [pin],
        getPosition: item => [item.lng, item.lat],
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
  const activeParamConfig = PARAMETERS.find(param => param.id === activeResultParam);
  const coverageText = activeParamData?.date_coverage?.start && activeParamData?.date_coverage?.end
    ? `${activeParamData.date_coverage.start} to ${activeParamData.date_coverage.end}`
    : `${startDate} to ${endDate}`;

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'var(--bg-primary)' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: nextState }) => setViewState(nextState)}
        controller={true}
        layers={[...pinLayers, ...deckLayers]}
        onClick={info => {
          if (info.coordinate) {
            setPin({ lat: info.coordinate[1], lng: info.coordinate[0] });
            setResults(null);
          }
        }}
        getCursor={() => 'crosshair'}
        useDevicePixels={2}
        onError={error => console.warn('DeckGL:', error.message)}
        getTooltip={({ object }) => {
          if (!object || object.value === undefined) return null;
          return {
            html: `<div style="padding:6px;font-size:11px;"><b>${object.value}</b><br/>${object.date}<br/>(${object.lat}, ${object.lng})</div>`,
            style: {
              backgroundColor: 'var(--tooltip-bg)',
              color: 'var(--tooltip-text)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '6px',
            },
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

      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 z-30 flex items-center gap-2 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm transition-all"
        style={{ background: 'var(--bg-nav)', border: '1px solid var(--bg-nav-border)', color: 'var(--text-secondary)' }}
      >
        <X className="h-4 w-4" />
        Exit Research
      </button>

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

      {pin && (
        <div className={`absolute top-0 right-0 h-full z-30 transition-all duration-300 ${showPanel ? 'w-[400px]' : 'w-0'}`}>
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
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Search className="h-5 w-5 text-cyan-400" />
                    Query Builder
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Configure your spatial-temporal query</p>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-cyan-400" />
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>How research mode works</p>
                  </div>
                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>Queries use gridded satellite observations near the clicked coordinate, not continuous ground sensors at every street location.</p>
                    <p>A 10 km radius can still return a small number of observations because availability depends on product resolution, revisit dates, cloud-free scenes, and the selected date window.</p>
                    <p>If nothing falls inside the chosen radius, the backend falls back to the nearest available city dataset and reports that explicitly in the notes below.</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Parameters</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {PARAMETERS.map(param => (
                      <button
                        key={param.id}
                        onClick={() => toggleParam(param.id)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: selectedParams.includes(param.id) ? 'var(--bg-badge)' : 'transparent',
                          color: selectedParams.includes(param.id) ? 'var(--text-primary)' : 'var(--text-faint)',
                          border: selectedParams.includes(param.id) ? '1px solid var(--border)' : '1px solid transparent',
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: param.color, opacity: selectedParams.includes(param.id) ? 1 : 0.3 }} />
                        {param.label}
                      </button>
                    ))}
                  </div>
                </div>

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

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <Sliders className="h-3 w-3" /> Search Radius: {radiusKm}km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radiusKm}
                    onChange={e => setRadiusKm(parseInt(e.target.value, 10))}
                    className="w-full mt-2 accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    <span>1km</span><span>25km</span><span>50km</span>
                  </div>
                </div>

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

                    <div className="flex gap-1 flex-wrap">
                      {selectedParams.map(paramId => {
                        const paramData = results.parameters?.[paramId];
                        const paramConfig = PARAMETERS.find(param => param.id === paramId);
                        return (
                          <button
                            key={paramId}
                            onClick={() => setActiveResultParam(paramId)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
                            style={{
                              background: activeResultParam === paramId ? 'var(--bg-badge)' : 'transparent',
                              color: activeResultParam === paramId ? 'var(--text-primary)' : 'var(--text-faint)',
                              border: activeResultParam === paramId ? '1px solid var(--border)' : '1px solid transparent',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: paramConfig?.color }} />
                            {paramConfig?.label}
                            <span style={{ color: 'var(--text-faint)' }}>{paramData?.total_points || 0}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeParamData?.timeseries?.length > 0 && (
                      <ResearchChart
                        timeseries={activeParamData.timeseries}
                        label={activeParamConfig?.label}
                        color={activeParamConfig?.color}
                        unit={activeParamConfig?.unit}
                      />
                    )}

                    {activeParamData?.statistics && Object.keys(activeParamData.statistics).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Mean', value: activeParamData.statistics.mean },
                          { label: 'Min', value: activeParamData.statistics.min },
                          { label: 'Max', value: activeParamData.statistics.max },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
                            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{stat.label}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{stat.value?.toFixed?.(4) ?? '--'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeParamData && (
                      <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Research Notes</p>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                          {activeParamData.methodology || results.methodology}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Coverage: {coverageText} &middot; {activeParamData.date_coverage?.timestamps ?? 0} timestamps
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Distance spread: nearest {activeParamData.distance_km?.nearest ?? '--'} km &middot; farthest {activeParamData.distance_km?.farthest ?? '--'} km
                          </p>
                        </div>
                        <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                          Interpretation: this panel summarizes the observations actually returned by your filter. Small counts do not necessarily mean the area is inactive; they often reflect coarse grid spacing or sparse valid scenes inside the selected radius and dates.
                        </p>
                        {results.search_notes?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {results.search_notes.map((note, idx) => (
                              <p key={idx} className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{note}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeParamData?.top_locations?.length > 0 && (
                      <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Closest Matching Observations</p>
                        <div className="space-y-1.5">
                          {activeParamData.top_locations.slice(0, 5).map((row, idx) => (
                            <div key={`${row.date}-${idx}`} className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              <span>{row.date} &middot; {row.lat.toFixed(4)}, {row.lng.toFixed(4)}</span>
                              <span className="font-mono">{row._dist_km} km</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeParamData && (
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-faint)' }}>
                        {activeParamData.total_points} observations returned for this parameter within the current query context
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
