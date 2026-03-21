import Card from '../common/Card';
import FindingCard from './FindingCard';
import RecommendationCard from './RecommendationCard';
import {
  FileText, AlertTriangle, Lightbulb, Zap, Shield, MapPin,
  BarChart3, Satellite, Calendar, Target, AlertCircle, Database
} from 'lucide-react';

function SectionHeader({ icon: Icon, title, color = 'text-white', iconColor = 'text-cyan-400' }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <h2 className="text-lg font-bold uppercase tracking-wide ${color}">{title}</h2>
    </div>
  );
}

export default function PlanViewer({ plan }) {
  if (!plan) return null;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Report Header / Title Page ──────────────────────── */}
      <Card className="border-cyan-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-emerald-500" />
        <div className="pl-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono">
              {plan.report_number || 'EAP/AHM/2026/03-001'}
            </span>
            <span>{plan.classification || 'For Official Use'}</span>
          </div>

          <h1 className="text-2xl font-bold text-white leading-tight mb-2">
            {plan.report_title || `Environment Action Plan for ${plan.city}`}
          </h1>

          <p className="text-slate-400 text-sm mb-4">
            Satellite-Based Environmental Intelligence Assessment
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Prepared For</span>
              <span className="text-slate-300 font-medium">{plan.prepared_for || `${plan.city} Municipal Corporation`}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Prepared By</span>
              <span className="text-slate-300 font-medium">{plan.prepared_by || 'SatIntel Platform'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date</span>
              <span className="text-slate-300 font-medium">{new Date(plan.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Methodology</span>
              <span className="text-slate-300 font-medium">Multi-mission satellite RS + ML analytics</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Summary Statistics Bar ─────────────────────────── */}
      {plan.summary_statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Data Points Analyzed', value: plan.summary_statistics.total_data_points_analyzed?.toLocaleString(), icon: Database, color: 'text-cyan-400' },
            { label: 'Satellite Missions', value: plan.summary_statistics.satellite_missions_used, icon: Satellite, color: 'text-emerald-400' },
            { label: 'Anomalies Detected', value: plan.summary_statistics.total_anomalies_detected, icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Hotspot Clusters', value: plan.summary_statistics.total_hotspot_clusters, icon: MapPin, color: 'text-red-400' },
          ].map((stat) => (
            <Card key={stat.label} padding="p-4" className="text-center">
              <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-1`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Executive Summary ──────────────────────────────── */}
      <Card className="border-slate-600/50">
        <SectionHeader icon={FileText} title="Executive Summary" iconColor="text-cyan-400" />
        <div className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
          {plan.executive_summary || plan.summary}
        </div>
      </Card>

      {/* ── Data Sources ──────────────────────────────────── */}
      {plan.data_sources?.length > 0 && (
        <Card>
          <SectionHeader icon={Satellite} title="Data Sources" iconColor="text-emerald-400" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Mission</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Agency</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Parameter</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Resolution</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {plan.data_sources.map((src, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-white font-medium">{src.mission}</td>
                    <td className="py-2 px-3 text-slate-400">{src.agency}</td>
                    <td className="py-2 px-3 text-slate-300">{src.parameter}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-xs">{src.resolution}</td>
                    <td className="py-2 px-3 text-slate-400 text-xs">{src.coverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Priority Actions (TOP — catches attention) ─────── */}
      {plan.priority_actions?.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <SectionHeader icon={Zap} title="Immediate Priority Actions" iconColor="text-amber-400" />
          <div className="space-y-3">
            {plan.priority_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/60 border border-amber-500/15 rounded-lg">
                <div className="bg-amber-500/20 text-amber-400 text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Risk Assessment Matrix ────────────────────────── */}
      {plan.risk_matrix?.length > 0 && (
        <Card>
          <SectionHeader icon={Shield} title="Risk Assessment Matrix" iconColor="text-red-400" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Hazard</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Likelihood</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Impact</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Risk Level</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Affected Areas</th>
                </tr>
              </thead>
              <tbody>
                {plan.risk_matrix.map((risk, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-2 px-3 text-white font-medium">{risk.hazard}</td>
                    <td className="py-2 px-3 text-slate-300">{risk.likelihood}</td>
                    <td className="py-2 px-3 text-slate-400 text-xs max-w-xs">{risk.impact}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        risk.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        risk.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {risk.risk_level}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-xs">{risk.affected_areas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Key Findings ──────────────────────────────────── */}
      {plan.findings?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Key Findings</h2>
            <span className="text-xs text-slate-500">({plan.findings.length} findings from satellite analysis)</span>
          </div>
          <div className="space-y-4">
            {plan.findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} />
            ))}
          </div>
        </div>
      )}

      {/* ── Priority Zones Map Reference ──────────────────── */}
      {plan.priority_zones?.length > 0 && (
        <Card>
          <SectionHeader icon={MapPin} title="Priority Intervention Zones" iconColor="text-orange-400" />
          <div className="space-y-2">
            {plan.priority_zones.map((zone, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
                  zone.severity === 'critical' ? 'bg-red-500' :
                  zone.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{zone.name}</span>
                    <span className="text-xs font-mono text-slate-500">{zone.lat}°N, {zone.lng}°E</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{zone.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${
                  zone.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                  zone.severity === 'high' ? 'bg-orange-500/15 text-orange-400' :
                  'bg-amber-500/15 text-amber-400'
                }`}>
                  {zone.parameter}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recommendations ───────────────────────────────── */}
      {plan.recommendations?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Recommendations</h2>
          </div>
          <div className="space-y-4">
            {plan.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── Monitoring Framework & KPIs ───────────────────── */}
      {plan.monitoring_framework && (
        <Card>
          <SectionHeader icon={Target} title="Monitoring Framework & KPIs" iconColor="text-cyan-400" />

          {/* KPI Table */}
          {plan.monitoring_framework.kpis?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Key Performance Indicators</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Metric</th>
                      <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">Current Value</th>
                      <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">1-Year Target</th>
                      <th className="py-2 px-3 text-xs font-semibold text-slate-400 uppercase">3-Year Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.monitoring_framework.kpis.map((kpi, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="py-2 px-3 text-white font-medium">{kpi.metric}</td>
                        <td className="py-2 px-3 text-red-400 font-mono">{kpi.current}</td>
                        <td className="py-2 px-3 text-amber-400 font-mono">{kpi.target_1yr}</td>
                        <td className="py-2 px-3 text-emerald-400 font-mono">{kpi.target_3yr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quarterly Schedule */}
          {plan.monitoring_framework.schedule?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Quarterly Satellite Monitoring Schedule</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {plan.monitoring_framework.schedule.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-lg">
                    <Calendar className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white">{q.quarter}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{q.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Disclaimer ────────────────────────────────────── */}
      {plan.disclaimer && (
        <div className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed italic">
              <span className="font-semibold not-italic">Disclaimer: </span>
              {plan.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
