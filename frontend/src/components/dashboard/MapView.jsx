import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Map, { NavigationControl, FullscreenControl, Source, Layer } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { HeatmapLayer, HexagonLayer, GridLayer, ContourLayer, ScreenGridLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, ColumnLayer, ArcLayer, IconLayer, GeoJsonLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Globe, Mountain, Satellite, Map as MapIcon, Layers, Eye, Flame, Wind, BarChart3, Hexagon, Grid3x3, CircleDot, Activity, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Map Styles (all free, no API key) ──────────────────────────
const MAP_STYLES = {
  dark: {
    label: 'Dark',
    icon: MapIcon,
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  satellite: {
    label: 'Satellite',
    icon: Satellite,
    url: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; Esri',
        },
      },
      layers: [{ id: 'satellite-tiles', type: 'raster', source: 'esri-satellite' }],
    },
  },
  terrain: {
    label: 'Terrain',
    icon: Mountain,
    url: {
      version: 8,
      sources: {
        'otm': {
          type: 'raster',
          tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenTopoMap',
        },
      },
      layers: [{ id: 'terrain-tiles', type: 'raster', source: 'otm' }],
    },
  },
  streets: {
    label: 'Streets',
    icon: Globe,
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  light: {
    label: 'Light',
    icon: Eye,
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
};

// ── Visualization Modes ────────────────────────────────────────
const VIZ_MODES = {
  heatmap: { label: 'Heatmap', icon: Activity },
  hexbin: { label: '3D Hexbin', icon: Hexagon },
  grid: { label: '3D Grid', icon: Grid3x3 },
  scatter: { label: 'Scatter', icon: CircleDot },
  contour: { label: 'Contour', icon: BarChart3 },
};

// ── Color Ranges ───────────────────────────────────────────────
const COLOR_RANGES = {
  LST: [[59,130,246],[6,182,212],[251,191,36],[249,115,22],[239,68,68]],
  NDVI: [[146,64,14],[217,119,6],[132,204,22],[34,197,94],[5,150,105]],
  NO2: [[16,185,129],[132,204,22],[251,191,36],[168,85,247],[124,58,237]],
  SO2: [[34,197,94],[250,204,21],[245,158,11],[239,68,68],[185,28,28]],
  CO: [[59,130,246],[96,165,250],[250,204,21],[239,68,68],[220,38,38]],
  O3: [[147,197,253],[59,130,246],[37,99,235],[29,78,216],[30,58,138]],
  AEROSOL: [[254,243,199],[217,119,6],[180,83,9],[146,64,14],[92,45,13]],
  SOIL_MOISTURE: [[239,68,68],[249,115,22],[251,191,36],[59,130,246],[29,78,216]],
};

const ELEVATION_RANGE = [0, 3000];

export default function MapView({ layers = [], city, layerControl }) {
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState({});
  const [loadingLayers, setLoadingLayers] = useState(new Set());
  const [loadedLayers, setLoadedLayers] = useState(new Set());
  const [showProgress, setShowProgress] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark');
  const [vizMode, setVizMode] = useState('heatmap');
  const [show3D, setShow3D] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showFireLayer, setShowFireLayer] = useState(false);
  const [fireData, setFireData] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('style');
  const [viewState, setViewState] = useState({
    longitude: city.center[1],
    latitude: city.center[0],
    zoom: city.zoom,
    pitch: show3D ? 45 : 0,
    bearing: show3D ? -15 : 0,
    minZoom: 3,
    maxZoom: 18,
  });

  // Recenter on city change
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: city.center[1],
      latitude: city.center[0],
      zoom: city.zoom,
    }));
  }, [city.key]);

  // Toggle 3D pitch
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      pitch: show3D ? 45 : 0,
      bearing: show3D ? -15 : 0,
    }));
  }, [show3D]);

  // Track city to prevent stale fetches
  const cityRef = useRef(city.key);

  // Clear + refetch on city change
  useEffect(() => {
    cityRef.current = city.key;
    setHeatmapData({});
    setLoadingLayers(new Set());
    setLoadedLayers(new Set());
    setShowProgress(false);
  }, [city.key]);

  // Fetch heatmap data — each enabled layer loads independently
  useEffect(() => {
    const currentCity = city.key;
    const enabledLayers = layers.filter(l => l.enabled);

    enabledLayers.forEach(async (layer) => {
      const paramId = layer.id.toUpperCase();

      // Skip if already loaded for THIS city
      setHeatmapData(prev => {
        if (prev[paramId]) return prev;
        // Trigger fetch
        setLoadingLayers(p => new Set([...p, paramId]));
        fetch(`/api/v1/maps/heatmap/${paramId}?city=${currentCity}`)
          .then(res => res.json())
          .then(data => {
            // Only apply if city hasn't changed
            if (cityRef.current !== currentCity) return;
            if (data.raw_points) {
              setHeatmapData(p => ({ ...p, [paramId]: data.raw_points }));
              setLoadedLayers(p => new Set([...p, paramId]));
            }
          })
          .catch(err => console.error(`Failed to load ${paramId}:`, err))
          .finally(() => {
            setLoadingLayers(p => { const s = new Set(p); s.delete(paramId); return s; });
          });
        return prev;
      });
    });
  }, [layers, city.key]);

  const isLoadingData = loadingLayers.size > 0;

  // Show progress panel while loading, auto-hide 2s after all done
  useEffect(() => {
    if (isLoadingData) {
      setShowProgress(true);
    } else if (loadedLayers.size > 0) {
      const timer = setTimeout(() => setShowProgress(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoadingData, loadedLayers.size]);

  // Fetch NASA FIRMS fire data for Gujarat region
  useEffect(() => {
    if (!showFireLayer || fireData) return;
    (async () => {
      try {
        // NASA FIRMS VIIRS active fires - open CSV for India, last 24h
        const res = await fetch(
          'https://firms.modaps.eosdis.nasa.gov/api/country/csv/5e3a6e2203e42db4e94518ced498ba40/VIIRS_SNPP_NRT/IND/2'
        );
        const text = await res.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const latIdx = headers.indexOf('latitude');
        const lngIdx = headers.indexOf('longitude');
        const confIdx = headers.indexOf('confidence');
        const frpIdx = headers.indexOf('frp');
        const dateIdx = headers.indexOf('acq_date');

        const fires = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          const lat = parseFloat(cols[latIdx]);
          const lng = parseFloat(cols[lngIdx]);
          // Filter to Gujarat region roughly
          if (lat >= 20 && lat <= 24.5 && lng >= 68 && lng <= 74.5) {
            fires.push({
              lat, lng,
              confidence: cols[confIdx],
              frp: parseFloat(cols[frpIdx]) || 1,
              date: cols[dateIdx],
            });
          }
        }
        setFireData(fires);
      } catch (err) {
        console.error('Failed to load fire data:', err);
        setFireData([]);
      }
    })();
  }, [showFireLayer]);

  // Build Deck.gl layers
  const deckLayers = useMemo(() => {
    const result = [];
    const enabledLayers = layers.filter(l => l.enabled);

    enabledLayers.forEach(layer => {
      const paramId = layer.id.toUpperCase();
      const points = heatmapData[paramId];
      if (!points || points.length === 0) return;

      const colorRange = COLOR_RANGES[paramId] || COLOR_RANGES.LST;

      switch (vizMode) {
        case 'heatmap':
          result.push(new HeatmapLayer({
            id: `heatmap-${paramId}`,
            data: points,
            getPosition: d => [d.lng, d.lat],
            getWeight: d => Math.abs(d.value),
            radiusPixels: 50,
            intensity: 2,
            threshold: 0.05,
            colorRange,
            opacity: 0.75,
          }));
          break;

        case 'hexbin':
          result.push(new HexagonLayer({
            id: `hexbin-${paramId}`,
            data: points,
            getPosition: d => [d.lng, d.lat],
            getElevationWeight: d => Math.abs(d.value),
            getColorWeight: d => Math.abs(d.value),
            elevationScale: show3D ? 500 : 0,
            radius: 800,
            coverage: 0.85,
            upperPercentile: 95,
            colorRange,
            elevationRange: ELEVATION_RANGE,
            extruded: show3D,
            pickable: true,
            opacity: 0.8,
            material: {
              ambient: 0.64,
              diffuse: 0.6,
              shininess: 32,
              specularColor: [51, 51, 51],
            },
          }));
          break;

        case 'grid':
          result.push(new GridLayer({
            id: `grid-${paramId}`,
            data: points,
            getPosition: d => [d.lng, d.lat],
            getElevationWeight: d => Math.abs(d.value),
            getColorWeight: d => Math.abs(d.value),
            elevationScale: show3D ? 400 : 0,
            cellSize: 1000,
            coverage: 0.9,
            colorRange,
            extruded: show3D,
            pickable: true,
            opacity: 0.8,
          }));
          break;

        case 'scatter':
          result.push(new ScatterplotLayer({
            id: `scatter-${paramId}`,
            data: points,
            getPosition: d => [d.lng, d.lat],
            getRadius: d => Math.max(200, Math.abs(d.value) * 50),
            getFillColor: d => {
              const t = Math.min(1, Math.abs(d.value) / (Math.max(...points.map(p => Math.abs(p.value))) || 1));
              const idx = Math.floor(t * (colorRange.length - 1));
              return [...colorRange[Math.min(idx, colorRange.length - 1)], 180];
            },
            pickable: true,
            stroked: true,
            getLineColor: [255, 255, 255, 60],
            lineWidthMinPixels: 1,
            radiusUnits: 'meters',
          }));
          break;

        case 'contour':
          result.push(new ContourLayer({
            id: `contour-${paramId}`,
            data: points,
            getPosition: d => [d.lng, d.lat],
            getWeight: d => Math.abs(d.value),
            contours: [
              { threshold: 0.25, color: colorRange[0], strokeWidth: 1 },
              { threshold: 0.5, color: colorRange[1], strokeWidth: 2 },
              { threshold: [0.5, 0.75], color: [...colorRange[2], 100] },
              { threshold: 0.75, color: colorRange[3], strokeWidth: 2 },
              { threshold: [0.75, 1.0], color: [...colorRange[4], 140] },
            ],
            cellSize: 800,
            opacity: 0.7,
          }));
          break;
      }
    });

    // Fire layer
    if (showFireLayer && fireData && fireData.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'fires-glow',
        data: fireData,
        getPosition: d => [d.lng, d.lat],
        getRadius: d => Math.max(1500, d.frp * 100),
        getFillColor: [255, 80, 0, 80],
        radiusUnits: 'meters',
      }));
      result.push(new ScatterplotLayer({
        id: 'fires-core',
        data: fireData,
        getPosition: d => [d.lng, d.lat],
        getRadius: d => Math.max(500, d.frp * 30),
        getFillColor: d => {
          const h = d.confidence === 'high' ? 255 : d.confidence === 'nominal' ? 200 : 150;
          return [255, h > 200 ? 50 : 150, 0, 220];
        },
        pickable: true,
        radiusUnits: 'meters',
      }));
    }

    return result;
  }, [layers, heatmapData, vizMode, show3D, showFireLayer, fireData]);

  const getTooltip = useCallback(({ object, layer }) => {
    if (!object) return null;

    // Fire tooltip
    if (layer?.id?.startsWith('fires')) {
      return {
        html: `<div style="padding:8px;font-size:12px;">
          <b style="color:#ff5500;">Active Fire</b><br/>
          Confidence: ${object.confidence}<br/>
          Fire Power: ${object.frp} MW<br/>
          Date: ${object.date}<br/>
          Location: ${object.lat?.toFixed(4)}°N, ${object.lng?.toFixed(4)}°E
        </div>`,
        style: { backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #f97316', borderRadius: '8px' },
      };
    }

    // Aggregation layer tooltip (hexbin/grid)
    if (object.colorValue !== undefined) {
      return {
        html: `<div style="padding:8px;font-size:12px;">
          <b>Aggregated Cell</b><br/>
          Points: ${object.count}<br/>
          Avg Value: ${(object.colorValue / (object.count || 1)).toFixed(4)}
        </div>`,
        style: { backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px' },
      };
    }

    // Data point tooltip
    if (object.value !== undefined) {
      return {
        html: `<div style="padding:8px;font-size:12px;">
          <b>Value:</b> ${object.value}<br/>
          <b>Lat:</b> ${object.lat}<br/>
          <b>Lng:</b> ${object.lng}
        </div>`,
        style: { backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px' },
      };
    }

    return null;
  }, []);

  const currentStyle = MAP_STYLES[mapStyle];

  return (
    <div id="satintel-map-container" style={{ height: '100%', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', position: 'relative' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        controller={{ dragRotate: true, touchRotate: true }}
        layers={deckLayers}
        getTooltip={getTooltip}
        effects={showAtmosphere ? [] : []}
        useDevicePixels={2}
        onError={(error) => console.warn('DeckGL:', error.message)}
        _animate={false}
      >
        <Map
          mapStyle={currentStyle.url}
          attributionControl={false}
          maxPitch={85}
        >
          <NavigationControl position="bottom-right" visualizePitch={true} />
        </Map>
      </DeckGL>

      {/* ── Data Layer Control (top-right) ────────── */}
      {layerControl && (
        <div className="absolute top-3 right-3 z-20">
          {layerControl}
        </div>
      )}

      {/* ── Fullscreen Button (bottom-right, above nav controls) ── */}
      <button
        onClick={() => {
          const el = document.getElementById('satintel-map-container');
          if (!el) return;
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            el.requestFullscreen();
          }
        }}
        className="absolute bottom-28 right-2 z-10 w-8 h-8 flex items-center justify-center bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-slate-800/90 transition-all shadow-lg"
        title="Fullscreen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      {/* ── Unified Control Panel (top-left) ─────────── */}
      <div className="absolute top-3 left-3 z-10">
        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white/80 hover:bg-slate-800/90 hover:border-white/20 transition-all shadow-lg"
        >
          <Layers className="h-4 w-4" />
          <span className="font-medium">Controls</span>
        </button>

        {/* Panel */}
        {panelOpen && (
          <div className="absolute top-full left-0 mt-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-[260px] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {[
                { id: 'style', label: 'Style' },
                { id: 'viz', label: 'Visualize' },
                { id: 'extras', label: 'Extras' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
                    activeTab === tab.id
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-3">
              {/* Style tab */}
              {activeTab === 'style' && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(MAP_STYLES).map(([key, style]) => {
                    const Icon = style.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setMapStyle(key)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                          key === mapStyle
                            ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Visualize tab */}
              {activeTab === 'viz' && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(VIZ_MODES).map(([key, mode]) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setVizMode(key)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                          key === vizMode
                            ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Extras tab */}
              {activeTab === 'extras' && (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShow3D(!show3D)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all ${
                      show3D
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Mountain className="h-4 w-4" />
                      3D View
                    </span>
                    <span className={`w-8 h-4.5 rounded-full transition-colors relative ${show3D ? 'bg-cyan-500' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${show3D ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                  <button
                    onClick={() => setShowFireLayer(!showFireLayer)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all ${
                      showFireLayer
                        ? 'bg-orange-500/15 text-orange-400'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Flame className="h-4 w-4" />
                      Wildfires
                      {fireData && fireData.length > 0 && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">
                          {fireData.length}
                        </span>
                      )}
                    </span>
                    <span className={`w-8 h-4.5 rounded-full transition-colors relative ${showFireLayer ? 'bg-orange-500' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${showFireLayer ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Layer Loading Progress (top-right, below layer control) ── */}
      {showProgress && layers.some(l => l.enabled) && (
        <div className="absolute top-14 right-4 z-10 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 shadow-lg min-w-[160px]">
          <div className="space-y-1.5">
            {layers.filter(l => l.enabled).map(layer => {
              const paramId = layer.id.toUpperCase();
              const isLoading = loadingLayers.has(paramId);
              const isLoaded = loadedLayers.has(paramId) || !!heatmapData[paramId];
              const isWaiting = !isLoading && !isLoaded;

              return (
                <div key={layer.id} className="flex items-center gap-2">
                  {isLoaded ? (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/20">
                      <span className="text-[8px] text-emerald-400">&#10003;</span>
                    </span>
                  ) : isLoading ? (
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <span className="animate-ping absolute h-2.5 w-2.5 rounded-full opacity-75" style={{ backgroundColor: layer.color + '60' }} />
                      <span className="relative h-2 w-2 rounded-full" style={{ backgroundColor: layer.color }} />
                    </span>
                  ) : (
                    <span className="h-3.5 w-3.5 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
                    </span>
                  )}
                  <span className={`text-[10px] font-medium transition-colors duration-300 ${
                    isLoaded ? 'text-emerald-400/80' : isLoading ? 'text-white/70' : 'text-white/25'
                  }`}>
                    {layer.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Research Mode Button (bottom-left) ───── */}
      <button
        onClick={() => navigate('/research')}
        className="absolute bottom-4 left-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 hover:bg-slate-800/90 hover:border-cyan-500/30 transition-all group shadow-lg"
      >
        <Search className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Research</span>
      </button>
    </div>
  );
}
