import { Component, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import PlanViewer from '../components/action-plan/PlanViewer';
import { exportAsPDF, exportAsJSON } from '../components/action-plan/ExportPlan';
import { actionPlanService } from '../services/actionPlanService';
import { FileText, Sparkles, Download, FileDown, FileJson, Satellite, Brain, BarChart3, FileCheck } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAnalysisContext } from '../context/AnalysisContext';

const PIPELINE_STEPS = [
  { icon: Satellite, label: 'Fetching satellite data', sub: 'MODIS, Sentinel-5P, SMAP' },
  { icon: Brain, label: 'Running anomaly detection', sub: 'Isolation Forest' },
  { icon: BarChart3, label: 'Preparing evidence brief', sub: 'Trends, hotspots, land-use change' },
  { icon: FileCheck, label: 'Generating AI action plan', sub: 'Gemini 2.5 Flash recommendations' },
];

class PlanErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.plan !== this.props.plan && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-red-400 text-sm">
            The generated report had an unexpected format and could not be rendered. Please try generating it again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ActionPlanPage() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const generationSummary = plan ? {
    statusLabel: plan.llm_status === 'hybrid' ? 'AI-assisted report' : 'Template-generated report',
    statusTone: plan.llm_status === 'hybrid'
      ? { bg: 'rgba(16,185,129,0.12)', color: '#10B981' }
      : { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
    engineLabel: plan.llm_model || 'Structured report engine',
    sourceLabel: plan.source || 'unknown',
  } : null;

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setActiveStep(0);

    const interval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 2000);

    try {
      const result = await actionPlanService.generatePlan(city.key, ['LST', 'NDVI', 'NO2', 'SOIL_MOISTURE'], dateRange);
      setPlan(result);
    } catch (err) {
      setError(err.message || 'Failed to generate action plan');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Environment Action Plan</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Satellite-based environmental intelligence assessment for {city.name}</p>
          </div>
          <div className="flex gap-2">
            {plan && (
              <div className="relative">
                <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 rounded-xl shadow-2xl py-1 z-50 min-w-[180px]"
                    style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)' }}>
                    <button
                      onClick={() => { exportAsPDF(plan); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <FileDown className="h-4 w-4 text-red-400" />
                      Save as PDF
                    </button>
                    <button
                      onClick={() => { exportAsJSON(plan); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <FileJson className="h-4 w-4 text-cyan-400" />
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>
            )}
            <Button variant="primary" onClick={generatePlan} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Action Plan'}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {!plan && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <FileText className="h-7 w-7 text-cyan-400/60" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Action Plan Generated</h3>
            <p className="text-sm max-w-md text-center mb-8" style={{ color: 'var(--text-faint)' }}>
              The system will analyze satellite data across 4 missions, run ML models,
              and generate city-specific environmental recommendations.
            </p>
            <Button variant="primary" onClick={generatePlan}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate Action Plan
            </Button>
          </div>
        )}

        {/* Loading — Pipeline Steps */}
        {loading && (
          <div className="flex flex-col items-center py-16">
            <div className="w-full max-w-md space-y-3 mb-8">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = i < activeStep;
                const isActive = i === activeStep;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500"
                    style={{
                      background: isActive ? 'rgba(6,182,212,0.06)' : 'transparent',
                      border: isActive ? '1px solid rgba(6,182,212,0.15)' : '1px solid transparent',
                      opacity: isDone ? 0.4 : isActive ? 1 : 0.2,
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isDone ? 'rgba(16,185,129,0.1)' : isActive ? 'rgba(6,182,212,0.1)' : 'var(--bg-card)' }}>
                      {isDone ? (
                        <span className="text-emerald-400 text-sm">&#10003;</span>
                      ) : isActive ? (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                        </span>
                      ) : (
                        <Icon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium"
                        style={{ color: isDone ? 'var(--text-faint)' : isActive ? 'var(--text-primary)' : 'var(--text-faint)', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {step.label}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {plan && generationSummary && (
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: generationSummary.statusTone.bg, color: generationSummary.statusTone.color }}
              >
                {generationSummary.statusLabel}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Engine: <span style={{ color: 'var(--text-primary)' }}>{generationSummary.engineLabel}</span>
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Source: <span style={{ color: 'var(--text-primary)' }}>{generationSummary.sourceLabel}</span>
              </span>
              {plan.analysis_window && (
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Window: {plan.analysis_window.start_date} to {plan.analysis_window.end_date}
                </span>
              )}
            </div>
            {plan.llm_error && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                Fallback reason: {plan.llm_error}
              </p>
            )}
          </Card>
        )}

        {/* Plan */}
        {plan && (
          <PlanErrorBoundary plan={plan}>
            <PlanViewer plan={plan} />
          </PlanErrorBoundary>
        )}
      </div>
    </DashboardLayout>
  );
}
