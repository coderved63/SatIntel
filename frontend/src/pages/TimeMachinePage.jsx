import { useState, useEffect, useRef, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { timeMachineService } from '../services/timeMachineService';
import { useCity } from '../context/CityContext';
import { Clock, Thermometer, Leaf, Wind, Droplets, Map as MapIcon, TrendingUp, TrendingDown } from 'lucide-react';

const PARAMS = [
  { id: 'LST', label: 'Surface Temperature', icon: Thermometer, color: '#EF4444' },
  { id: 'NDVI', label: 'Vegetation (NDVI)', icon: Leaf, color: '#10B981' },
  { id: 'NO2', label: 'NO2 Pollution', icon: Wind, color: '#8B5CF6' },
  { id: 'SOIL_MOISTURE', label: 'Soil Moisture', icon: Droplets, color: '#3B82F6' },
  { id: 'LAND_USE', label: 'Land Use Change', icon: MapIcon, color: '#6B7280' },
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
  const [sliderX, setSliderX] = useState(0.5);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

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
      .catch(e => console.error('Time machine error:', e))
      .finally(() => setLoading(false));
  }, [param, city.key]);

  // Slider drag handling
  const updateSlider = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    setSliderX(fraction);
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (isDragging.current) updateSlider(e.clientX); };
    const onUp = () => { isDragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [updateSlider]);

  const scale = data?.meta?.scale || 'default';
  const colors = COLOR_RANGES[scale] || COLOR_RANGES.default;

  const makeLayer = (id, gridData) => new HeatmapLayer({
    id,
    data: gridData || [],
    getPosition: d => [d.lng, d.lat],
    getWeight: d => Math.abs(d.value),
    radiusPixels: 40,
    intensity: 1.2,
    threshold: 0.05,
    colorRange: colors,
  });

  const selectedParam = PARAMS.find(p => p.id === param) || PARAMS[0];
  const ParamIcon = selectedParam.icon;
  const isWorse = (param === 'NDVI' || param === 'SOIL_MOISTURE')
    ? data?.change_direction === 'decreased'
    : data?.change_direction === 'increased';

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-teal-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Environmental Time Machine</h1>
            <p className="text-slate-400 text-sm">
              Drag the divider to compare {data?.year_a || '2023'} vs {data?.year_b || '2024'} — real satellite data
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
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Change summary */}
        {data && !loading && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            isWorse
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {isWorse
              ? <TrendingUp className="h-5 w-5" />
              : <TrendingDown className="h-5 w-5" />
            }
            <span className="text-sm font-medium">
              {selectedParam.label} {data.change_direction} by {Math.abs(data.avg_change || 0).toFixed(4)} {data.meta?.unit || ''}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              city average | {data.year_a} → {data.year_b}
            </span>
          </div>
        )}

        {/* Slider Map */}
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader text={`Loading ${selectedParam.label} comparison...`} />
          </div>
        ) : data ? (
          <div
            ref={containerRef}
            className="relative h-[500px] rounded-xl overflow-hidden border border-slate-700"
          >
            {/* LEFT side (Year A) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderX * 100}% 0 0)` }}
            >
              <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState: vs }) => setViewState(vs)}
                controller={true}
                layers={[makeLayer('heat-a', data.grid_a)]}
                style={{ width: '100%', height: '100%' }}
              >
                <Map mapStyle={BASEMAP} style={{ width: '100%', height: '100%' }} />
              </DeckGL>
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/80 border border-slate-600 text-white backdrop-blur-sm pointer-events-none z-10">
                {data.year_a}
              </div>
            </div>

            {/* RIGHT side (Year B) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${sliderX * 100}%)` }}
            >
              <DeckGL
                viewState={viewState}
                controller={false}
                layers={[makeLayer('heat-b', data.grid_b)]}
                style={{ width: '100%', height: '100%' }}
              >
                <Map mapStyle={BASEMAP} style={{ width: '100%', height: '100%' }} />
              </DeckGL>
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/80 border border-teal-500 text-teal-400 backdrop-blur-sm pointer-events-none z-10">
                {data.year_b}
              </div>
            </div>

            {/* Divider */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-teal-400 cursor-col-resize z-50"
              style={{
                left: `${sliderX * 100}%`,
                boxShadow: '0 0 12px rgba(20,184,166,0.8)',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                isDragging.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-teal-400 flex items-center justify-center shadow-lg cursor-col-resize">
                <span className="text-teal-400 text-sm font-bold select-none">&#x27E8;&#x27E9;</span>
              </div>
            </div>

            {/* Drag hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs text-slate-400 bg-slate-900/70 backdrop-blur-sm pointer-events-none">
              Drag to compare
            </div>
          </div>
        ) : null}

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Color Scale — {selectedParam.label}</p>
            <div className="h-3 rounded-full" style={{
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
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              {scale === 'temperature' && <><span>Cool</span><span>Hot</span></>}
              {scale === 'vegetation' && <><span>Bare</span><span>Dense</span></>}
              {scale === 'pollution' && <><span>Clean</span><span>Polluted</span></>}
              {scale === 'moisture' && <><span>Dry</span><span>Wet</span></>}
              {scale === 'landuse' && <><span>Water</span><span>Urban</span></>}
            </div>
          </Card>
          <Card padding="p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">How to Read</p>
            <div className="space-y-1 text-xs text-slate-400">
              <p><span className="text-white font-medium">Left</span> = {data?.year_a || '2023'}</p>
              <p><span className="text-teal-400 font-medium">Right</span> = {data?.year_b || '2024'}</p>
              <p>Drag the <span className="text-teal-400">handle</span> to reveal changes</p>
              <p>Scroll + drag the map to navigate</p>
            </div>
          </Card>
        </div>

        <p className="text-[10px] text-slate-600 text-center font-mono">
          Data: {param === 'LST' ? 'NASA MODIS MOD11A2' : param === 'NDVI' ? 'NASA MODIS MOD13A2' : param === 'LAND_USE' ? 'USGS Landsat 8/9' : 'ESA Sentinel-5P TROPOMI'} via Google Earth Engine
        </p>
      </div>
    </DashboardLayout>
  );
}
