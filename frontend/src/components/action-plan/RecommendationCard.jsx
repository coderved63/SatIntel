import Card from '../common/Card';
import { Clock, MapPin, Users, TrendingUp, Wallet } from 'lucide-react';

const priorityColors = {
  immediate: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'short-term': { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'long-term': { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

export default function RecommendationCard({ recommendation, index }) {
  const priority = priorityColors[recommendation.priority] || priorityColors['short-term'];
  const rec = recommendation;

  return (
    <Card padding="p-0" className={`${priority.border} border overflow-hidden`}>
      <div className="flex">
        {/* Left index stripe */}
        <div className={`w-12 ${priority.bg} flex items-start justify-center pt-4 shrink-0`}>
          <span className={`text-lg font-bold ${priority.text}`}>
            {rec.id || `R-${String(index).padStart(2, '0')}`}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{rec.title}</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize shrink-0 font-semibold ${priority.text} ${priority.bg}`}>
              {rec.priority}
            </span>
          </div>

          {/* Description — supports multiline with \n\n */}
          <div className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
            {rec.description}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {rec.timeline && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span style={{ color: 'var(--text-muted)' }}>{rec.timeline}</span>
              </span>
            )}
            {rec.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span style={{ color: 'var(--text-muted)' }}>{rec.location}</span>
              </span>
            )}
            {rec.responsible_authority && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span style={{ color: 'var(--text-muted)' }}>{rec.responsible_authority}</span>
              </span>
            )}
            {rec.estimated_impact && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-400">{rec.estimated_impact}</span>
              </span>
            )}
            {rec.budget_category && (
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span style={{ color: 'var(--text-muted)' }}>{rec.budget_category}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
