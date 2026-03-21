import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import PlanViewer from '../components/action-plan/PlanViewer';
import { exportAsPDF, exportAsJSON } from '../components/action-plan/ExportPlan';
import { actionPlanService } from '../services/actionPlanService';
import { FileText, Sparkles, Download, FileDown, FileJson } from 'lucide-react';
import { useCity } from '../context/CityContext';

export default function ActionPlanPage() {
  const { city } = useCity();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);

    const steps = [
      'Fetching satellite data from MODIS, Sentinel-5P, SMAP...',
      'Running anomaly detection (Isolation Forest)...',
      'Analyzing trends (ARIMA forecasting)...',
      'Identifying hotspot clusters (DBSCAN)...',
      'Generating environment action plan...',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProgress(steps[stepIndex]);
        stepIndex++;
      }
    }, 1500);

    try {
      const result = await actionPlanService.generatePlan(city.key);
      setPlan(result);
    } catch (err) {
      setError(err.message || 'Failed to generate action plan');
    } finally {
      clearInterval(interval);
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Environment Action Plan</h1>
            <p className="text-slate-400 text-sm mt-1">Satellite-based environmental intelligence assessment</p>
          </div>
          <div className="flex gap-3">
            {plan && (
              <div className="relative">
                <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-50 min-w-[180px]">
                    <button
                      onClick={() => { exportAsPDF(plan); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <FileDown className="h-4 w-4 text-red-400" />
                      Save as PDF
                    </button>
                    <button
                      onClick={() => { exportAsJSON(plan); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
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

        {!plan && !loading && (
          <Card className="text-center py-20">
            <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Action Plan Generated Yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Click "Generate Action Plan" to run the multi-agent pipeline. The system will analyze satellite data,
              run ML models, and generate city-specific recommendations.
            </p>
            <Button variant="primary" onClick={generatePlan}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate Action Plan
            </Button>
          </Card>
        )}

        {loading && (
          <Card className="text-center py-16">
            <Loader size="lg" text="" />
            <p className="text-cyan-400 mt-4 font-medium">{progress}</p>
            <div className="mt-4 max-w-md mx-auto">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card className="border-red-500/30">
            <p className="text-red-400">{error}</p>
          </Card>
        )}

        {plan && <PlanViewer plan={plan} />}
      </div>
    </DashboardLayout>
  );
}
