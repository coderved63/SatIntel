import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import PlanViewer from '../components/action-plan/PlanViewer';
import { actionPlanService } from '../services/actionPlanService';
import { FileText, Sparkles, Download } from 'lucide-react';

export default function ActionPlanPage() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);

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
      const result = await actionPlanService.generatePlan('Ahmedabad');
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
            <p className="text-slate-400 text-sm mt-1">AI-generated city-specific environmental recommendations</p>
          </div>
          <div className="flex gap-3">
            {plan && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
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
