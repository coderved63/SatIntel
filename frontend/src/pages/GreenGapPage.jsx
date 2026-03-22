import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { greenGapService } from '../services/greenGapService';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TreePine, Thermometer, Leaf, MapPin, TrendingDown, Target } from 'lucide-react';
import { useCity } from '../context/CityContext';
import ExportButton from '../components/common/ExportButton';
import { exportToCsv } from '../utils/exportCsv';

const severityColor = (s) => s === 'critical' ? '#dc2626' : s === 'high' ? '#f59e0b' : '#16a34a';

export default function GreenGapPage() {
  const { city } = useCity();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    greenGapService.analyse(city.key)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [city.key]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <Loader text="Fitting NDVI-LST regression and scoring plantation sites..." />
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <Card><p className="text-red-400">{error}</p></Card>
    </DashboardLayout>
  );

  const top50 = data?.top_50_sites || [];
  const reg = data?.regression;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Green Infrastructure Gap Analysis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Where to plant trees for maximum cooling impact — powered by NDVI-LST satellite regression
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="p-4 text-center">
            <Target className="h-5 w-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.critical_sites || 0}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Critical Sites</p>
          </Card>
          <Card padding="p-4 text-center">
            <TrendingDown className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.avg_projected_cooling || 0}°C</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Projected Cooling</p>
          </Card>
          <Card padding="p-4 text-center">
            <Thermometer className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.max_projected_cooling || 0}°C</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Max Possible Cooling</p>
          </Card>
          <Card padding="p-4 text-center">
            <MapPin className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.total_candidate_cells || 0}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Candidate Sites</p>
          </Card>
        </div>

        {/* Regression Card */}
        {reg && (
          <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
            <div className="flex items-center gap-2 mb-2">
              <TreePine className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>NDVI-LST Regression — Fitted from Satellite Data</span>
            </div>
            <p className="text-sm text-emerald-300 mb-2">{reg.interpretation}</p>
            <div className="flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Slope ({'\u03B2\u2081'}) = <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{reg.beta1}</span></span>
              <span>R² = <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{reg.r_squared}</span></span>
              <span>Sample = <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{reg.sample_size} cells</span></span>
            </div>
          </Card>
        )}

        {/* Map + Site List */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Map */}
          <div className="lg:col-span-3">
            <Card padding="p-0" className="h-[500px]">
              <MapContainer
                center={city.center}
                zoom={city.zoom || 11}
                key={city.key}
                style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution="CARTO"
                />
                {top50.map((site, i) => (
                  <CircleMarker
                    key={i}
                    center={[site.lat, site.lng]}
                    radius={8}
                    pathOptions={{
                      color: severityColor(site.severity),
                      fillColor: severityColor(site.severity),
                      fillOpacity: 0.75,
                      weight: selected?.lat === site.lat ? 3 : 0,
                    }}
                    eventHandlers={{ click: () => setSelected(site) }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>#{i + 1} — {site.severity}</strong><br />
                        Cooling: -{site.projected_cooling}°C<br />
                        NDVI: {site.current_ndvi} | Temp: {site.current_lst}°C
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </Card>
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              {[
                { color: '#dc2626', label: 'Critical priority' },
                { color: '#f59e0b', label: 'High priority' },
                { color: '#16a34a', label: 'Moderate priority' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Site Detail / List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected Site Detail */}
            {selected ? (
              <Card className="border-emerald-500/20">
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Site Detail</p>
                <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>{selected.lat.toFixed(4)}°N, {selected.lng.toFixed(4)}°E</p>

                {/* Before / After */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-400">Current</p>
                    <p className="text-xl font-bold text-red-400">{selected.current_lst}°C</p>
                    <p className="text-xs text-red-400/60">NDVI {selected.current_ndvi}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-400">After Planting</p>
                    <p className="text-xl font-bold text-emerald-400">{selected.projected_new_lst}°C</p>
                    <p className="text-xs text-emerald-400/60">NDVI target 0.35</p>
                  </div>
                </div>

                {/* Impact */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3 text-center">
                  <p className="text-3xl font-bold text-emerald-400">-{selected.projected_cooling}°C</p>
                  <p className="text-xs text-emerald-400/60 mt-1">Projected surface temperature reduction</p>
                </div>

                {/* Species */}
                <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>Recommended Species</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.recommended_species}</p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Priority:</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--skeleton)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${selected.priority_score}%`,
                      backgroundColor: severityColor(selected.severity),
                    }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{selected.priority_score}/100</span>
                </div>
              </Card>
            ) : (
              <Card className="text-center py-8">
                <TreePine className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click a site on the map to see details</p>
              </Card>
            )}

            {/* Top Sites List */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Top 50 Plantation Sites</p>
                <ExportButton onClick={() => exportToCsv(top50, `green_gap_${city.key}`, [
                  { key: 'lat', label: 'Latitude' },
                  { key: 'lng', label: 'Longitude' },
                  { key: 'current_ndvi', label: 'Current NDVI' },
                  { key: 'current_lst', label: 'Current LST (C)' },
                  { key: 'projected_cooling', label: 'Projected Cooling (C)' },
                  { key: 'priority_score', label: 'Priority Score' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'recommended_species', label: 'Recommended Species' },
                ])} label="Export Sites CSV" />
              </div>
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                {top50.map((site, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(site)}
                    className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-all ${
                      selected?.lat === site.lat && selected?.lng === site.lng
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : ''
                    }`}
                    style={!(selected?.lat === site.lat && selected?.lng === site.lng) ? { background: 'transparent' } : undefined}
                    onMouseEnter={e => { if (!(selected?.lat === site.lat && selected?.lng === site.lng)) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={e => { if (!(selected?.lat === site.lat && selected?.lng === site.lng)) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="text-xs font-mono w-6" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor(site.severity) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{site.lat.toFixed(3)}°N, {site.lng.toFixed(3)}°E</span>
                        <span className="text-xs font-semibold text-emerald-400">-{site.projected_cooling}°C</span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        NDVI: {site.current_ndvi} | {site.current_lst}°C | {site.land_class}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
