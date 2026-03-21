import Card from '../common/Card';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

const severityColors = {
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#FBBF24',
};

export default function HotspotMap({ data }) {
  if (!data) return null;

  const { hotspots = [], parameter, total_points, cluster_count } = data;

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
          <MapContainer
            center={[23.0225, 72.5714]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />

            {hotspots.map((hotspot) => (
              <Circle
                key={hotspot.cluster_id}
                center={[hotspot.center_lat, hotspot.center_lng]}
                radius={(hotspot.radius_km || 1) * 1000}
                pathOptions={{
                  color: severityColors[hotspot.severity] || '#FBBF24',
                  fillColor: severityColors[hotspot.severity] || '#FBBF24',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>Cluster #{hotspot.cluster_id}</strong><br />
                    Severity: <span className="capitalize">{hotspot.severity}</span><br />
                    Points: {hotspot.num_points}<br />
                    Avg Value: {hotspot.avg_value}<br />
                    Center: ({hotspot.center_lat}, {hotspot.center_lng})
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>
      </Card>

      {/* Hotspot List */}
      {hotspots.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Cluster Details</h3>
          <div className="space-y-2">
            {hotspots.map(h => (
              <div key={h.cluster_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <MapPin className="h-4 w-4" style={{ color: severityColors[h.severity] }} />
                <div className="flex-1">
                  <span className="text-sm text-white">Cluster #{h.cluster_id}</span>
                  <span className="text-xs text-slate-500 ml-2">({h.center_lat}, {h.center_lng})</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{
                  backgroundColor: `${severityColors[h.severity]}20`,
                  color: severityColors[h.severity],
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
