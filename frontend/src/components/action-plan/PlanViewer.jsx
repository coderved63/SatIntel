import Card from '../common/Card';
import FindingCard from './FindingCard';
import RecommendationCard from './RecommendationCard';
import { FileText, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

export default function PlanViewer({ plan }) {
  if (!plan) return null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <div className="flex items-start gap-3">
          <FileText className="h-6 w-6 text-cyan-400 shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Executive Summary</h2>
            <p className="text-slate-300 leading-relaxed">{plan.summary}</p>
            <p className="text-xs text-slate-500 mt-3">Generated: {new Date(plan.generated_at).toLocaleString()} | City: {plan.city}</p>
          </div>
        </div>
      </Card>

      {/* Priority Actions */}
      {plan.priority_actions?.length > 0 && (
        <Card className="border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Priority Actions</h2>
          </div>
          <div className="space-y-2">
            {plan.priority_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded">{i + 1}</span>
                <p className="text-sm text-slate-200">{action}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Findings */}
      {plan.findings?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Key Findings</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {plan.findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {plan.recommendations?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          </div>
          <div className="space-y-4">
            {plan.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
