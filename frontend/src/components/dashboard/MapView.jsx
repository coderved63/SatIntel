import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { satelliteService } from '../../services/satelliteService';

// Heatmap layer component using leaflet.heat
function HeatmapLayer({ points, options = {} }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    import('leaflet.heat').then(() => {
      const heat = window.L.heatLayer(points, {
        radius: options.radius || 25,
        blur: options.blur || 15,
        maxZoom: options.maxZoom || 17,
        gradient: options.gradient || { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1: 'red' },
        ...options,
      });
      heat.addTo(map);

      return () => {
        map.removeLayer(heat);
      };
    });
  }, [map, points, options]);

  return null;
}

// Recenter map when city changes
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Color gradient helpers
const GRADIENTS = {
  LST: { 0.2: '#3B82F6', 0.4: '#06B6D4', 0.6: '#FBBF24', 0.8: '#F97316', 1: '#EF4444' },
  NDVI: { 0.2: '#92400E', 0.4: '#D97706', 0.6: '#84CC16', 0.8: '#22C55E', 1: '#059669' },
  NO2: { 0.2: '#10B981', 0.4: '#84CC16', 0.6: '#FBBF24', 0.8: '#A855F7', 1: '#7C3AED' },
  SOIL_MOISTURE: { 0.2: '#EF4444', 0.4: '#F97316', 0.6: '#FBBF24', 0.8: '#3B82F6', 1: '#1D4ED8' },
};

export default function MapView({ layers = [], city }) {
  const [heatmapData, setHeatmapData] = useState({});
  const [markerData, setMarkerData] = useState({});

  useEffect(() => {
    setHeatmapData({});
    setMarkerData({});
    const enabledLayers = layers.filter(l => l.enabled);
    enabledLayers.forEach(async (layer) => {
      try {
        const paramId = layer.id.toUpperCase();
        const res = await fetch(`/api/v1/maps/heatmap/${paramId}?city=${city.key}`);
        const data = await res.json();

        if (data.points) {
          setHeatmapData(prev => ({ ...prev, [paramId]: data.points }));
          setMarkerData(prev => ({ ...prev, [paramId]: data.raw_points || [] }));
        }
      } catch (err) {
        console.error(`Failed to load ${layer.id} heatmap:`, err);
      }
    });
  }, [layers, city.key]);

  const enabledLayers = layers.filter(l => l.enabled);

  return (
    <MapContainer
      center={city.center}
      zoom={city.zoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      className="z-0"
    >
      <RecenterMap center={city.center} zoom={city.zoom} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {/* Heatmap layers */}
      {enabledLayers.map(layer => {
        const paramId = layer.id.toUpperCase();
        const points = heatmapData[paramId];
        if (!points || points.length === 0) return null;

        return (
          <HeatmapLayer
            key={paramId}
            points={points}
            options={{
              radius: 30,
              blur: 20,
              gradient: GRADIENTS[paramId] || GRADIENTS.LST,
            }}
          />
        );
      })}

      {/* Marker overlays for detailed values */}
      {enabledLayers.map(layer => {
        const paramId = layer.id.toUpperCase();
        const markers = markerData[paramId];
        if (!markers || markers.length === 0) return null;

        return markers.map((point, idx) => (
          <CircleMarker
            key={`${paramId}-${idx}`}
            center={[point.lat, point.lng]}
            radius={4}
            fillColor={layer.color}
            fillOpacity={0.6}
            stroke={false}
          >
            <Popup>
              <div className="text-xs">
                <strong>{layer.label}</strong><br />
                Value: {point.value}<br />
                Lat: {point.lat}, Lng: {point.lng}
              </div>
            </Popup>
          </CircleMarker>
        ));
      })}
    </MapContainer>
  );
}
