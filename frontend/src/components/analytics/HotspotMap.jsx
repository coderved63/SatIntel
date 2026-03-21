import { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../common/Card';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';
import { useCity } from '../../context/CityContext';

const severityColors = {
  critical: [239, 68, 68],
  high: [249, 115, 22],
  moderate: [251, 191, 36],
};

const severityHex = {
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#FBBF24',
};

export default function HotspotMap({ data }) {
  const { city } = useCity();

  const [viewState, setViewState] = useState({
    longitude: city.center[1],
    latitude: city.center[0],
    zoom: city.zoom,
    pitch: 25,
    bearing: 0,
  });

  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: city.center[1],
      latitude: city.center[0],
      zoom: city.zoom,
    }));
  }, [city.key]);

  const deckLayers = useMemo(() => {
    if (!data?.hotspots?.length) return [];

    return [
      // Outer glow ring
      new ScatterplotLayer({
        id: 'hotspot-outer',
        data: data.hotspots,
        getPosition: d => [d.center_lng, d.center_lat],
        getRadius: d => (d.radius_km || 1) * 1000,
        getFillColor: d => [...(severityColors[d.severity] || severityColors.moderate), 40],
        getLineColor: d => [...(severityColors[d.severity] || severityColors.moderate), 120],
        stroked: true,
        lineWidthMinPixels: 2,
        pickable: true,
        radiusUnits: 'meters',
      }),
      // Inner point
      new ScatterplotLayer({
        id: 'hotspot-center',
        data: data.hotspots,
        getPosition: d => [d.center_lng, d.center_lat],
        getRadius: 400,
        getFillColor: d => [...(severityColors[d.severity] || severityColors.moderate), 220],
        pickable: true,
        radiusUnits: 'meters',
      }),
    ];
  }, [data]);

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null;
    return {
      html: `<div style="padding:8px;font-size:12px;">
        <b>Cluster #${object.cluster_id}</b><br/>
        Severity: <span style="text-transform:capitalize">${object.severity}</span><br/>
        Points: ${object.num_points}<br/>
        Avg Value: ${object.avg_value}<br/>
        Center: (${object.center_lat}, ${object.center_lng})
      </div>`,
      style: {
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        borderRadius: '8px',
      },
    };
  }, []);

  if (!data) return null;

  const { hotspots = [], parameter, cluster_count } = data;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Hotspot Clusters</h3>
            <p className="text-sm text-slate-400">DBSCAN Clustering — {parameter}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-400">{cluster_count}</p>
            <p className="text-xs text-slate-500">clusters found</p>
          </div>
        </div>

        <div className="h-[400px] rounded-lg overflow-hidden">
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(vs)}
            controller={true}
            layers={deckLayers}
            getTooltip={getTooltip}
          >
            <Map
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              attributionControl={false}
            />
          </DeckGL>
        </div>
      </Card>

      {/* Hotspot List */}
      {hotspots.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Cluster Details</h3>
          <div className="space-y-2">
            {hotspots.map(h => (
              <div key={h.cluster_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <MapPin className="h-4 w-4" style={{ color: severityHex[h.severity] }} />
                <div className="flex-1">
                  <span className="text-sm text-white">Cluster #{h.cluster_id}</span>
                  <span className="text-xs text-slate-500 ml-2">({h.center_lat}, {h.center_lng})</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{
                  backgroundColor: `${severityHex[h.severity]}20`,
                  color: severityHex[h.severity],
                }}>
                  {h.severity}
                </span>
                <span className="text-xs text-slate-400">{h.num_points} pts</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
