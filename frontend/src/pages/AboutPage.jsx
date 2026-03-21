import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { Satellite, Brain, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-white">About SatIntel</h1>
          <p className="text-slate-400 text-sm mt-1">Satellite Environmental Intelligence Platform</p>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-3">What is this?</h2>
          <p className="text-slate-300 leading-relaxed">
            SatIntel is a satellite environmental intelligence platform that ingests data from multiple satellite missions
            (MODIS, Sentinel-5P, SMAP), harmonizes it to a common grid, runs ML analytics (anomaly detection, trend prediction,
            hotspot clustering), and generates actionable Environment Action Plans for city administrators.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-3">Multi-Agent Architecture</h2>
          <div className="space-y-3 text-slate-300">
            <p><span className="text-cyan-400 font-medium">Data Agent</span> — Fetches and harmonizes satellite data from Google Earth Engine</p>
            <p><span className="text-emerald-400 font-medium">Analysis Agent</span> — Runs Isolation Forest, ARIMA, and DBSCAN ML models</p>
            <p><span className="text-amber-400 font-medium">Action Plan Agent</span> — Generates city-specific recommendations using LLM</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Data Sources</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'MODIS (NASA)', desc: 'Land Surface Temperature, Vegetation Index' },
              { name: 'Sentinel-5P (ESA)', desc: 'Tropospheric NO₂, Air Quality' },
              { name: 'SMAP (NASA)', desc: 'Soil Moisture' },
              { name: 'Landsat 8/9 (NASA/USGS)', desc: 'Land Use, Surface Temperature' },
            ].map(s => (
              <div key={s.name} className="bg-slate-800 rounded-lg p-3">
                <p className="text-white font-medium text-sm">{s.name}</p>
                <p className="text-slate-500 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-slate-500 text-sm">
            Built for AETRIX 2026 — PS-4: Satellite Environmental Intelligence Platform for Smart Cities
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
