import { CalendarRange, RotateCcw } from 'lucide-react';
import { useAnalysisContext } from '../../context/AnalysisContext';

export default function DateRangeControl() {
  const { dateRange, setDateRange, resetDateRange } = useAnalysisContext();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
      <CalendarRange className="h-4 w-4 text-cyan-400" />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateRange.start_date}
          onChange={e => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
          className="rounded-lg px-2 py-1 text-xs"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
        />
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>to</span>
        <input
          type="date"
          value={dateRange.end_date}
          onChange={e => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
          className="rounded-lg px-2 py-1 text-xs"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
        />
      </div>
      <button
        onClick={resetDateRange}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-faint)' }}
        title="Reset analysis window"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
