import Card from './Card';
import { Calendar, Database, Info, MapPinned, ShieldAlert } from 'lucide-react';
import { displayWindow } from '../../utils/dateRange';

export default function EvidenceContextPanel({ title = 'Evidence Context', evidence, compact = false }) {
  if (!evidence) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        <div>
          <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: 'var(--text-secondary)' }}><Calendar className="h-3 w-3" /> Analysis Window</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{displayWindow(evidence.analysis_window)}</p>
        </div>
        <div>
          <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: 'var(--text-secondary)' }}><Database className="h-3 w-3" /> Methodology</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{evidence.methodology || 'Methodology unavailable'}</p>
        </div>
        <div>
          <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: 'var(--text-secondary)' }}><MapPinned className="h-3 w-3" /> Spatial Basis</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{evidence.spatial_basis || 'Spatial basis unavailable'}</p>
        </div>
        <div>
          <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: 'var(--text-secondary)' }}><ShieldAlert className="h-3 w-3" /> Limitations</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{evidence.limitations || 'Limitations unavailable'}</p>
        </div>
      </div>
      {evidence.confidence && (
        <p className="text-xs mt-3" style={{ color: 'var(--text-faint)' }}>
          Confidence: {evidence.confidence}
        </p>
      )}
    </Card>
  );
}
