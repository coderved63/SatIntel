import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { Satellite, Brain, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>About SatIntel</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Satellite Environmental Intelligence Platform</p>
        </div>

        <Card>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>What is this?</h2>
          <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            SatIntel is a satellite environmental intelligence platform that ingests data from multiple satellite missions
            (MODIS, Sentinel-5P, SMAP), harmonizes it to a common grid, runs ML analytics (anomaly detection, trend prediction,
            hotspot clustering), and generates actionable Environment Action Plans for city administrators.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Multi-Agent Architecture</h2>
          <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
            <p><span className="text-cyan-400 font-medium">Data Agent</span> — Fetches and harmonizes satellite data from Google Earth Engine</p>
            <p><span className="text-emerald-400 font-medium">Analysis Agent</span> — Runs Isolation Forest, ARIMA, and DBSCAN ML models</p>
            <p><span className="text-amber-400 font-medium">Action Plan Agent</span> — Generates city-specific recommendations using LLM</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Data Sources</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'MODIS (NASA)', desc: 'Land Surface Temperature, Vegetation Index' },
              { name: 'Sentinel-5P (ESA)', desc: 'Tropospheric NO\u2082, Air Quality' },
              { name: 'SMAP (NASA)', desc: 'Soil Moisture' },
              { name: 'Landsat 8/9 (NASA/USGS)', desc: 'Land Use, Surface Temperature' },
            ].map(s => (
              <div key={s.name} className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Built for AETRIX 2026 — PS-4: Satellite Environmental Intelligence Platform for Smart Cities
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
