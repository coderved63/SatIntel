import Card from '../common/Card';
import { Clock, MapPin } from 'lucide-react';

const priorityColors = {
  immediate: { text: 'text-red-400', bg: 'bg-red-500/10' },
  'short-term': { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  'long-term': { text: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function RecommendationCard({ recommendation, index }) {
  const priority = priorityColors[recommendation.priority] || priorityColors['short-term'];

  return (
    <Card padding="p-4">
      <div className="flex items-start gap-3">
        <span className="bg-cyan-500/20 text-cyan-400 text-sm font-bold px-2.5 py-1 rounded-lg shrink-0">
          {index}
        </span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{recommendation.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${priority.text} ${priority.bg}`}>
              {recommendation.priority}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-2">{recommendation.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {recommendation.timeline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {recommendation.timeline}
              </span>
            )}
            {recommendation.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {recommendation.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
